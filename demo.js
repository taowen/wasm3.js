const wasm3 = require('./wasm3')();

(async() => {
    await wasm3.ready;
    const runtime = wasm3._new_runtime();
})();