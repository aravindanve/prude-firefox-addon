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

// null device
var nulld = {
    push: function (val) { return []; },
    length: 0
};

function getStackReference(GUID) {
    // return null device for orphan frames
    if (null === GUID) return nulld;
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
    for (var i = 0; i < prude._attached.length; i++) {
        prude._attached[i].port.emit('update', {
            '_enabled': prude._enabled
        });
    }
}

function clearStack(worker) {
    if (('undefined' !== typeof worker.GUID) && 
        (false === worker.inFrame) && 
        (null !== worker.GUID)) {
        worker.stackRef.length = 0;
        return true;
    }
    return false;
}

function popStack(worker) {
    if (('object' === typeof worker.stackRef) &&
        ('undefined' !== typeof worker.stackRef.length) &&
        (worker.stackRef.length > 0)) {
        return worker.stackRef.pop();
    }
    return false;
}

function attachWorker(worker) {
    if (!(prude._attached.indexOf(worker) > -1)) {
        prude._attached.push(worker);
        return true;
    }
    return false;
}

function detachWorker(worker) {
    if (!prude._attached.length) return false;
    var indexToRemove = prude._attached.indexOf(worker);
    if (indexToRemove > -1) {
        prude._attached.splice(indexToRemove, 1);
        return true;
    } else {
        return false;
    }
}

function onAttach(worker) {
    attachWorker(worker);

    // configure
    worker.port.emit('configure', {
        '_enabled': prude._enabled
    });

    // register worker
    worker.port.on('register', function (blocker) {
        worker.GUID = blocker.GUID;
        worker.inFrame = blocker.inFrame;
        worker.stackRef = getStackReference(blocker.GUID);
        // prude._attached.push(worker); // moved to first thing on attach
        // clear stack if main window registering
        clearStack(worker);
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

    // clear stack
    worker.port.on('clear', function () {
        clearStack(worker);
        updateCounter(worker);
    });

    // pop stack
    worker.port.on('popstack', function () {
        var _popup = popStack(worker);
        if (false !== _popup) {
            worker.port.emit('popup', _popup);
        }
        updateCounter(worker);
    });

    // get debug information
    worker.port.on('_debug', function () {
        worker.port.emit('_prude', prude);
    });

    // remove worker data
    worker.on('detach', function () {
        detachWorker(this);
    });
}



// eof