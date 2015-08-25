// prude-firefox-addon
// http://github.com/aravindanve
// blocker.js

// IMPORTANT, set to false in production mode
var debug = true;


// GUIDs
var wGUID = {
    mul: 0x10000, // 65536
    mkrand: function () {
        return Math.floor(Math.random() * wGUID.mul).toString(16);
    },
    mkguid: function () {
        var rs = wGUID.mkrand;
        return rs() + rs() + "-" + rs() + "-" + rs() + "-" + 
            rs() + "-" + rs() + rs() + rs();
    },
    fetch: function (context) {
        var topWindow = context;
        while (topWindow != topWindow.parent) {
            topWindow = topWindow.parent;
        }
        if (!topWindow.name.match(/^GUID-/)) {
            topWindow.name = 'GUID-' + wGUID.mkguid();
        }
        return topWindow.name;
    },
    get credits() {
        return "thanks to @mvaraujo \n" + 
            "https://stackexchange.com/users/71335/mvaraujo";
    }
};

// get or set window id
var GUID = null;

try {
    var GUID = wGUID.fetch(unsafeWindow);
} catch (e) {
    // usually ends up here on
    // Permission denied to access property "name"
    if (debug) {
        dump(e + '\n');
    }
}

// check if in iframe
var inFrame = false,  
    topWindowAccess = true;

try {
    // check if we have permission to access top window
    var _topLocationHref = window.top.location.href;

    // if we have access, check some other way
    if (null !== window.frameElement) {
        inFrame = true;
    }

} catch (e) {
    // error on permission denied, we are in an iframe
    inFrame = true;
    topWindowAccess = false;
}

// begin

var blockerInfo = {
    GUID: GUID,
    inFrame: inFrame
};
var blockerConf = {
    _enabled: true,
    _count: 0
};

function isBlockerEnabled() {
    return blockerConf._enabled === true;
}

function enableBlocker() {
    blockerConf._enabled = true;
    return isBlockerEnabled();
}

function disableBlocker() {
    blockerConf._enabled = false;
    return isBlockerEnabled();
}

function addPopupToStack(args) {
    self.port.emit('blocked', args);
}

var finalOpen = function (context, original) {
    return function (url, name, opts) {
        context.open._blocker = context.open._blocker || {_enabled: true};
        if (blockerConf._enabled === false) {
            return original.call(context, url, name, opts);
        } else {
            addPopupToStack({url, name, opts});
            return null;
        }
    }
}(unsafeWindow, window.open);

// configure blocker
self.port.on('configure', function (options) {
    // import options
    options = options || {_enabled: true};
    blockerConf._enabled = options._enabled;

    // get temp stack
    var tempStack = [];

    try {
        if (('object' === typeof unsafeWindow.open._tempStack) &&
            ('undefined' !== typeof unsafeWindow.open._tempStack.length)) {
            for (var i = 0; i < unsafeWindow.open._tempStack.length; i++) {
                tempStack.push({ 
                    'url': unsafeWindow.open._tempStack[i].url, 
                    'name': unsafeWindow.open._tempStack[i].name, 
                    'opts': unsafeWindow.open._tempStack[i].opts
                });
            }
        }
    } catch (e) {
        // usually ends up here on
        // Permission denied to access property "wrappedJSObject"
        if (debug) {
            dump(e + '\n');
        }
    }

    // register blocker
    self.port.emit('register', {
        GUID: GUID, 
        inFrame: inFrame
    });


    try {
        // export modified window.open
        unsafeWindow.open = exportFunction(finalOpen, unsafeWindow);

        // evaluate temp stack
        for (var i = 0; i < tempStack.length; i++) {
            unsafeWindow.open.call(unsafeWindow, 
                tempStack[i].url, tempStack[i].name, tempStack[i].opts);
        }
    } catch (e) {
        // usually ends up here on
        // Permission denied to access property "wrappedJSObject"
        if (debug) {
            dump(e + '\n');
        }
    }

    // set up control
    if (!inFrame) {
        setUpControl(document);
    }
});

// update configuration
self.port.on('update', function (options) {
    if (options._enabled) {
        enableBlocker();
    } else {
        disableBlocker();
    }
    // update control
    control.updateToggle(isBlockerEnabled());
});

var control = {
    updateCounter: function (count) {},
    updateToggle: function (on) {}
};

// update counter
self.port.on('counter', function (count) {
    blockerConf._count = count;
    // update control
    control.updateCounter(count);
});

// open single popup
self.port.on('popup', function (popup) {
    window.open.call(unsafeWindow, 
        popup.url, popup.name, popup.opts);
});

// handle on worker detach
self.port.on('detach', function () {
    window.close();
});

// set up control -- only for top window
function setUpControl(document) {
    // helpers
    function _escapeRegExp(string){
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }
    function _getClassRegExp(cl) {
        return new RegExp('\\b' + _escapeRegExp(cl) + '\\b', 'gi');
    }
    function hasClass(elem, cl) {
        var re = _getClassRegExp(cl);
        if (!elem.className) return false;
        return elem.className.match(re) || false;
    }
    function addClass(elem, cl) {
        if (!hasClass(elem, cl)) {
            elem.className = elem.className + ' ' + cl;
        }
    }
    function removeClass(elem, cl) {
        elem.className = elem.className.replace(
            _getClassRegExp(cl), '');
    }
    function toggleButton(tglBtn, on) {
        if ('undefined' === typeof on)  on = !isBlockerEnabled();

        // toggle and update button class
        if (on) {
            enableBlocker();
            removeClass(tglBtn, 'off');
            tglBtn.innerHTML = 'on';
        } else {
            disableBlocker();
            addClass(tglBtn, 'off');
            tglBtn.innerHTML = 'off';
        }

        // update configuration across workers
        self.port.emit('toggle', {_enabled: on});
    }

    try {
        // create control
        var prudeControl = document.createElement('div');
        prudeControl.setAttribute('class', 'prude-firefox-addon-control');
        prudeControl.innerHTML = '' +
            '<span class="count-bubble"></span>' +
            '<span class="message-bubble-arrow"></span>' +
            '<span class="message-bubble"></span>' +
            '<span class="toggle-bubble"></span>' + 
            '<span class="help-text">click to&nbsp;</span>';

        // insert control
        document.body.insertBefore(prudeControl, document.body.firstChild);

        var countBubble = null;
        var messageBubble = null;
        var toggleBubble = null;

        var ch;

        if (prudeControl) {
            for (ch = prudeControl.firstChild; ch; ch = ch.nextSibling) {
                if (!ch.className) continue;
                if (hasClass(ch, 'count-bubble')) {
                    countBubble = ch;
                } else if (hasClass(ch, 'message-bubble')) {
                    messageBubble = ch;
                } else if (hasClass(ch, 'toggle-bubble')) {
                    toggleBubble = ch;
                }
            }
        }

        if (countBubble && messageBubble && toggleBubble) {
            // configure count-bubble
            countBubble.innerHTML = blockerConf._count;
            if (blockerConf._count) {
                removeClass(countBubble, 'green');
            } else {
                addClass(countBubble, 'green');
            }

            // configure message-bubble
            messageBubble.innerHTML = 'blocked';

            // configure toggle-bubble
            if (blockerConf._enabled) {
                removeClass(toggleBubble, 'off');
                toggleBubble.innerHTML = 'on';
            } else {
                addClass(toggleBubble, 'off');
                toggleBubble.innerHTML = 'off';
            }

            // toggle button
            toggleBubble.addEventListener('click', function (e) {
                toggleButton(e.target);
            });

            // clear all button
            messageBubble.addEventListener('click', function (e) {
                self.port.emit('clear');
            });

            // open most recent button
            countBubble.addEventListener('click', function (e) {
                self.port.emit('popstack');
            });

            // replace updateCounter function
            control.updateCounter = function (count) {
                countBubble.innerHTML = count;
                if (count) {
                    removeClass(countBubble, 'green');
                } else {
                    addClass(countBubble, 'green');
                }
            };

            // replace updateToggle function
            control.updateToggle = function (on) {
                // update button class
                if (on) {
                    removeClass(toggleBubble, 'off');
                    toggleBubble.innerHTML = 'on';
                } else {
                    addClass(toggleBubble, 'off');
                    toggleBubble.innerHTML = 'off';
                }
            }
        }
    } catch (e) {
        // usually ends up here on
        // document.body not found
        if (debug) {
            dump(e + '\n');
        }
    }
}

// DEBUG FUNCTIONS
if (debug) {
    // expose stack
    function getPrude() {
        self.port.emit('_debug');
    }

    unsafeWindow.getPrude = exportFunction(getPrude, unsafeWindow);

    self.port.on('_prude', function (prude) {
        unsafeWindow._prude = cloneInto(prude, unsafeWindow, {
            cloneFunctions: true,
            wrapReflectors: true
        });
    });
}

// eof



