// prude-firefox-addon
// http://github.com/aravindanve
// beforeload.js

// modify window.open
var openMod = function (context, original) {
    return function (url, name, opts) {
        // blocker aware window.open
        if ('undefined' === typeof context.open._blocker) {
            // blocker not configured
            context.open._tempStack = context.open._tempStack || [];
            // push popup to temp stack
            context.open._tempStack.push({url, name, opts});

        } else if (false === context.open._blocker) {
            // blocker disabled
            original.call(context, url, name, opts);

        } else {
            // blocker enabled
            context.open._blocker.addToStack({url, name, opts});
        }
    }
}(unsafeWindow, unsafeWindow.open);

openMod._modded = 'beforeload';

// export modified window.open
unsafeWindow.open = exportFunction(openMod, unsafeWindow);


