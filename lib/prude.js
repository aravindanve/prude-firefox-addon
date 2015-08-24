// exports
exports.startPrude = startPrude;

// start prude
function startPrude() {
    return new Prude();
}

function Prude() {
    this.test_func();
}

Prude.prototype = {
    test_var: null,
    test_func: function (test) {
        console.log('here');
    }
};