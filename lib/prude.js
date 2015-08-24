// includes
var self = require('sdk/self');
var pageMod = require('sdk/page-mod');

// exports

// attach beforeload.js
pageMod.PageMod({
    include: "*",
    contentScriptFile: [self.data.url('beforeload.js')],
    contentScriptWhen: 'start',
    attachTo: ['existing', 'top', 'frame']
});

// attach style.css and blocker.js
pageMod.PageMod({
    include: "*",
    contentStyleFile: [self.data.url('style.css')],
    contentScriptFile: [self.data.url('blocker.js')],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'top', 'frame'],
    onAttach: function(worker) {
        console.log('attached to worker');
    }
});


// eof