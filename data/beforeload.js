// prude-firefox-addon
// http://github.com/aravindanve
// beforeload.js

var tempOpen = function (context, original) {
    return function (url, name, opts) {
        context.open._tempStack = context.open._tempStack || [];
        context.open._tempStack.push({url, name, opts});
        return null;
    }
}(unsafeWindow, unsafeWindow.open);

// unsafeWindow.____open = exportFunction(unsafeWindow.open, unsafeWindow);
unsafeWindow.open = exportFunction(tempOpen, unsafeWindow);


