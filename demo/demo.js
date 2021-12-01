const wasm3 = require('../wasm3')();
const fs = require('fs');

// callback from wasm3.c
Object.assign(wasm3, {
    LinkedFunctions: [
        {
            moduleName: 'wasi_snapshot_preview1',
            functionName: 'fd_write',
            signature: 'i(i*i*)',
            run(file_descriptor, iovs, iovs_len, nwritten) {
                const ptr = this + wasm3.HEAPU32[iovs >> 2];
                const len = wasm3.HEAPU32[(iovs >> 2) + 1];
                process.stdout.write(decodeStringView(ptr, len));
            }
        },
        {
            moduleName: 'env',
            functionName: 'main.copyBytesFromJsToGo',
            signature: 'v(iiiii)',
            run(dst, src, length) {
                wasm3.HEAP8.set(wasm3.HEAP8.subarray(src, src + length), this + dst);
            }
        }
    ],
    ShowError(ptr) {
        console.log("!!! error", decodePtrString(ptr));
    },
})

function decodeStringView(ptr, len) {
    const octets = wasm3.HEAP8.subarray(ptr, ptr + len);
    var string = "";
    var i = 0;
    while (i < octets.length) {
        var octet = octets[i];
        var bytesNeeded = 0;
        var codePoint = 0;
        if (octet <= 0x7F) {
            bytesNeeded = 0;
            codePoint = octet & 0xFF;
        } else if (octet <= 0xDF) {
            bytesNeeded = 1;
            codePoint = octet & 0x1F;
        } else if (octet <= 0xEF) {
            bytesNeeded = 2;
            codePoint = octet & 0x0F;
        } else if (octet <= 0xF4) {
            bytesNeeded = 3;
            codePoint = octet & 0x07;
        }
        if (octets.length - i - bytesNeeded > 0) {
            var k = 0;
            while (k < bytesNeeded) {
                octet = octets[i + k + 1];
                codePoint = (codePoint << 6) | (octet & 0x3F);
                k += 1;
            }
        } else {
            codePoint = 0xFFFD;
            bytesNeeded = octets.length - i;
        }
        string += String.fromCodePoint(codePoint);
        i += bytesNeeded + 1;
    }
    return string
}

function decodePtrString(ptr) {
    const octets = wasm3.HEAP8.subarray(ptr);
    var string = "";
    var i = 0;
    while (i < octets.length) {
        var octet = octets[i];
        var bytesNeeded = 0;
        var codePoint = 0;
        if (octet <= 0x7F) {
            bytesNeeded = 0;
            codePoint = octet & 0xFF;
        } else if (octet <= 0xDF) {
            bytesNeeded = 1;
            codePoint = octet & 0x1F;
        } else if (octet <= 0xEF) {
            bytesNeeded = 2;
            codePoint = octet & 0x0F;
        } else if (octet <= 0xF4) {
            bytesNeeded = 3;
            codePoint = octet & 0x07;
        }
        if (octets.length - i - bytesNeeded > 0) {
            var k = 0;
            while (k < bytesNeeded) {
                octet = octets[i + k + 1];
                codePoint = (codePoint << 6) | (octet & 0x3F);
                k += 1;
            }
        } else {
            codePoint = 0xFFFD;
            bytesNeeded = octets.length - i;
        }
        if (codePoint === 0) {
            break;
        }
        string += String.fromCodePoint(codePoint);
        i += bytesNeeded + 1;
    }
    return string
}

function decodeInt32(ptr) {
    return wasm3.HEAP32[ptr >> 2]
}

class ObjectPool {
    wasm3;
    ptrs = [];

    constructor(wasm3) {
        this.wasm3 = wasm3;
    }

    encodeString(string) {
        var octets = [];
        var length = string.length;
        var i = 0;
        while (i < length) {
            var codePoint = string.codePointAt(i);
            var c = 0;
            var bits = 0;
            if (codePoint <= 0x0000007F) {
                c = 0;
                bits = 0x00;
            } else if (codePoint <= 0x000007FF) {
                c = 6;
                bits = 0xC0;
            } else if (codePoint <= 0x0000FFFF) {
                c = 12;
                bits = 0xE0;
            } else if (codePoint <= 0x001FFFFF) {
                c = 18;
                bits = 0xF0;
            }
            octets.push(bits | (codePoint >> c));
            c -= 6;
            while (c >= 0) {
                octets.push(0x80 | ((codePoint >> c) & 0x3F));
                c -= 6;
            }
            i += codePoint >= 0x10000 ? 2 : 1;
        }
        octets.push(0);
        const ptr = this.malloc(octets.length);
        this.wasm3.HEAP8.set(octets, ptr);
        return ptr;
    }

    encodeBytes(string) {
        var octets = [];
        var length = string.length;
        var i = 0;
        while (i < length) {
            var codePoint = string.codePointAt(i);
            var c = 0;
            var bits = 0;
            if (codePoint <= 0x0000007F) {
                c = 0;
                bits = 0x00;
            } else if (codePoint <= 0x000007FF) {
                c = 6;
                bits = 0xC0;
            } else if (codePoint <= 0x0000FFFF) {
                c = 12;
                bits = 0xE0;
            } else if (codePoint <= 0x001FFFFF) {
                c = 18;
                bits = 0xF0;
            }
            octets.push(bits | (codePoint >> c));
            c -= 6;
            while (c >= 0) {
                octets.push(0x80 | ((codePoint >> c) & 0x3F));
                c -= 6;
            }
            i += codePoint >= 0x10000 ? 2 : 1;
        }
        const ptr = this.malloc(octets.length);
        this.wasm3.HEAP8.set(octets, ptr);
        return [ptr, octets.length];
    }

    encodeU32(val) {
        const ptr = this.malloc(4);
        this.wasm3.HEAPU32[ptr >> 2] = val;
        return ptr;
    }

    encodePtrArray(ptrArray) {
        const ptr = this.malloc(ptrArray.length * 4);
        const offset = ptr >> 2;
        for (let i = 0; i < ptrArray.length; i++) {
            this.wasm3.HEAPU32[offset + i] = ptrArray[i];
        }
        return ptr;
    }

    malloc(bytesCount) {
        const ptr = this.wasm3._malloc(bytesCount);
        this.ptrs.push(ptr);
        return ptr;
    }

    dispose() {
        for (const ptr of this.ptrs) {
            this.wasm3._free(ptr);
        }
        this.ptrs.length = 0;
    }
}

function loadDemo() {
    const runtime = wasm3._new_runtime();
    const buff = fs.readFileSync('./demo.wasm');
    const ptr = wasm3._malloc(buff.length);
    wasm3.HEAP8.set(buff, ptr);
    const module = wasm3._load(runtime, ptr, buff.length);
    return { runtime, module };
}

function linkFunctions(module) {
    const objectPool = new ObjectPool(wasm3);
    try {
        for (const [index, linkedFunction] of wasm3.LinkedFunctions.entries()) {
            wasm3._link_function(module, 
                objectPool.encodeString(linkedFunction.moduleName),
                objectPool.encodeString(linkedFunction.functionName),
                objectPool.encodeString(linkedFunction.signature),
                index
            );
        } 
    } finally {
        objectPool.dispose();
    }
}

function callDemo(runtime) {
    const objectPool = new ObjectPool(wasm3);
    try {
        const [bufferPtr, bufferLen] = objectPool.encodeBytes(`[{
            "name": "apple",
            "price": 102
        }]`);
        const args = [objectPool.encodeString("runDemo"), objectPool.encodeU32(bufferPtr), objectPool.encodeU32(bufferLen)];
        const ptr = objectPool.encodePtrArray(args);
        const result = wasm3._call(runtime, args.length, ptr);
        return result;
    } finally {
        objectPool.dispose();
    }
}


(async () => {
    await wasm3.ready;
    wasm3._init();
    const { runtime, module } = loadDemo();
    linkFunctions(module);
    // take snapshot
    console.log('snapshot size', wasm3.HEAP8.byteLength);
    var snapshot = new Uint8Array(wasm3.HEAP8.byteLength);
    snapshot.set(wasm3.HEAP8);
    callDemo(runtime);
    // restore snapshot
    wasm3.HEAP8.set(snapshot);
    callDemo(runtime);
})();