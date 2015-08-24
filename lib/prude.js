// prude-firefox-addon
// http://github.com/aravindanve
// prude.js

var self = require('sdk/self');
var pageMod = require('sdk/page-mod');

// main object
var prude = {
    _enabled: true,
    _stack: {},
    _attached: [],
};

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
    onAttach: onAttach
});

// functions
function getStackReference(GUID) {
    prude._stack[GUID] = prude._stack[GUID] || [];
    return prude._stack[GUID];
}

function updateCounter(workerRef) {
    var GUID = workerRef.GUID;
    var count = workerRef.stackRef.length;
    var found = false;
    for (worker of prude._attached) {
        if ((worker.GUID === GUID) &&
            (worker.inFrame === false)) {
            worker.port.emit('counter', count);
            found = worker;
        }
    }
    return found;
}

function reconfigureBlockers() {
    for (var i = 0; i < prude._attached; i++) {
        prude._attached[i].port.emit('update', {
            '_enabled': prude._enabled
        });
    }
}

function detachWorker(worker) {
    var indexToRemove = -1;
    for (var i = 0; i < prude._attached; i++) {
        if (worker === prude._attached[i]) {
            indexToRemove = i;
        }
    }
    if (indexToRemove > -1) {
        prude._attached.splice(indexToRemove, 1);
    }
}

function onAttach(worker) {
    // configure
    worker.port.emit('configure', {
        '_enabled': prude._enabled
    });

    // register worker
    worker.port.on('register', function (blocker) {
        worker.GUID = blocker.GUID;
        worker.inFrame = blocker.inFrame;
        worker.stackRef = getStackReference(blocker.GUID);
        prude._attached.push(worker);
    });

    // add popup to stack
    worker.port.on('blocked', function (popup) {
        worker.stackRef.push(popup);
        updateCounter(worker);
    });

    // update config
    worker.port.on('toggle', function (options) {
        if (options._enabled === false) {
            // disable blocker
            prude._enabled = false;
            reconfigureBlockers();
        } else {
            // enable blocker
            prude._enabled = true;
            reconfigureBlockers();
        }
    });

    // get stack
    worker.port.on('_all', function () {
        worker.port.emit('_prude', prude);
    });

    // remove worker data
    worker.on('detach', function () {
        detachWorker(this);
    });
}



// eof