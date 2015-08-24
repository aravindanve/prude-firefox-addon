// prude-firefox-addon
// http://github.com/aravindanve
// blocker.js

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
var GUID = wGUID(unsafeWindow);

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

// blocker
function Blocker() {}

Blocker.prototype = {
    GUID: null,
    inFrame: false,
    addToStack: function (popup) {
        self.port.emit('blocked', popup);
    }
};

var blocker = null;

function isBlockerEnabled() {
    return (unsafeWindow.open._blocker instanceof Blocker);
}

function enableBlocker() {
    if (null == blocker) return null;
    unsafeWindow.open._blocker = blocker;
    return isBlockerEnabled();
}

function disableBlocker() {
    if (null == blocker) return null;
    unsafeWindow.open._blocker = false;
    return isBlockerEnabled();
}

// configure blocker
self.port.on('configure', function (options) {
    var _blocker = new Blocker();
    _blocker.GUID = GUID;
    _blocker.inFrame = inFrame;
    blocker = cloneInto(_blocker, unsafeWindow, true);
    self.port.emit('register', {
        GUID: blocker.GUID, 
        inFrame: blocker.inFrame
    });
    unsafeWindow.open._blocker = blocker;
    // empty tempStack
    var tempStack = unsafeWindow.open._tempStack;
    delete unsafeWindow.open._tempStack;
    // handle popups from temp stack
    for (var i = 0; i < tempStack.length; i++) {
        unsafeWindow.open.call(unsafeWindow, 
            tempStack[i].url, tempStack[i].name, tempStack[i].opts);
    }
});

// update configuration
self.port.on('update', function (options) {
    var result = null;
    if (options._enabled) {
        result = enableBlocker();
    } else {
        result = disableBlocker();
    }
    // console.log('blocker status: ' + result);

    // update control
    if (!inFrame && (result != null)) {

    }
});

var control = {
    updateCounter: function (count) {}
};

// update counter
self.port.on('counter', function (count) {
    // update control
    control.updateCounter(count);
});

// set up control -- only for top window
if (!inFrame) {
    (function (document) {
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
            for (ch = prudeControl.firstChild; ch; ch.nextSibling) {
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
            countBubble.innerHTML = '0';
            messageBubble.innerHTML = 'blocked';
            toggleBubble.innerHTML = 'on';

            // count color
            addClass(countBubble, 'green');

            // toggle button
            toggleBubble.addEventListener('click', function (e) {
                toggleButton(e.target);
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
        }
    })(document);
}



// eof



