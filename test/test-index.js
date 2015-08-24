// prude-firefox-addon
// http://github.com/aravindanve
// test-index.js

var tabs = require('sdk/tabs');
var main = require("../lib/prude");

// tests
exports['test openMod'] = function(assert, done) {
    /*
    // FIGURE OUT HOW TO TEST CONTENT SCRIPTS
    tabs[0].url = 'http://localhost/prude-firefox-addon/';
    console.log(tabs[0].url);
    console.log(test); */

    // test finished
    done();
};

require("sdk/test").run(exports);

/* 

var tabs = require('sdk/tabs');
var pageWorker = require('sdk/page-worker');
var pageMod = require('sdk/page-mod');
var main = require("../lib/prude");

// helpers
function emit(prop, context, label) {
    context = context || 'unsafeWindow';
    fullProp = (context? context + '.' : '') + prop;
    fullLabel = label || (context === 'unsafeWindow'? 'window.' + prop : fullProp);
    return "self.port.emit({'" + fullLabel + "': " + fullProp + "});";
}
function getTab(tabs) {
    for (let tab in tabs) return tab;
}


// tests
exports['test openMod'] = function(assert, done) {

    var tab = getTab(tabs);
    var script = emit('unsafeWindow.open._modded');
    tab.attach({
        contentScript: script
    }).port.on('window.open._modded', function (message) {
        console.log(message);
    });
    tab.url = 'http://localhost/prude-firefox-addon/';


//const tabs = require("sdk/tabs");

tabs.open({
  url: "./page.html",
  onReady: function(tab) {
    tab.attach({
      contentScript: 'alert(self.options.a);',
      contentScriptOptions: {
        a: "blah"
      }
    }); 
console.log('here');
  }
});

    var temp = 'none';
    var tab = tabs[0]
    tabs[0].url = 
    pageMod.pageMod({
        include: '*',
        contentScript: script,
        contentScriptWhen: 'end',

    });
    var page = pageWorker.Page({
        contentScript: script,
        contentScriptWhen: 'end',
        contentURL: 'http://localhost/prude-firefox-addon',
        onMessage: function (message) {
            console.log(message);
            temp = message;
            assert.ok(
                ('undefined' !== typeof message['window.open._modded']), 
                'open successfully modded'
            );
            page.destroy();
        }
    });
    test.wait 
    console.log(temp);

    // test finished
    done();
};

require("sdk/test").run(exports);

*/