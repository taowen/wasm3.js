//
//  Wasm3 - high performance WebAssembly interpreter written in C.
//
//  Copyright © 2019 Steven Massey, Volodymyr Shymanskyy.
//  All rights reserved.
//

#include <stdio.h>
#include <stdlib.h>
#include <emscripten.h>

#include "wasm3.h"
#include "m3_env.h"

IM3Environment env;

EM_JS(void, js_ShowError, (M3Result result), {
    if (Module.ShowError) {
        Module.ShowError(result);
    }
});

EM_JS(M3RawCall, js_AddFunctionBySignature, (
        const char * const    i_moduleName,
        const char * const    i_functionName,
        const char * const    i_signature), {
    if (Module.AddFunctionBySignature) {
        return Module.AddFunctionBySignature({ moduleName: i_moduleName, functionName: i_functionName, signature: i_signature });
    }
    return 0;
});

EMSCRIPTEN_KEEPALIVE
void init() {
    env = m3_NewEnvironment ();
    if (!env) return;
}

EMSCRIPTEN_KEEPALIVE
IM3Runtime new_runtime() {
    return m3_NewRuntime (env, 64*1024, NULL);
}

EMSCRIPTEN_KEEPALIVE
void free_runtime(IM3Runtime runtime) {
    m3_FreeRuntime (runtime);
}

EMSCRIPTEN_KEEPALIVE
IM3Module load(IM3Runtime runtime, uint8_t* wasm, size_t fsize) {
    M3Result result = m3Err_none;

    IM3Module module;
    result = m3_ParseModule (env, &module, wasm, fsize);
    if (result) {
        js_ShowError(result);
        return 0;
    };
    result = m3_LoadModule (runtime, module);
    if (result) {
        js_ShowError(result);
        return 0;
    };
    return module;
}

EMSCRIPTEN_KEEPALIVE
uint32_t call(IM3Runtime runtime, int argc, const char* argv[]) {
    M3Result result = m3Err_none;

    IM3Function f;
    result = m3_FindFunction (&f, runtime, argv[0]);
    if (result) {
        js_ShowError(result);
        return -1;
    };

    result = m3_CallArgv (f, argc-1, argv+1);
    if (result) {
        js_ShowError(result);
        M3ErrorInfo info;
        m3_GetErrorInfo (runtime, &info);
        js_ShowError(info.message);
        return -2;
    };

    return *(uint64_t*)(runtime->stack);
}

m3ApiRawFunction(CallImport)
{
    IM3Function f = _ctx->function;
    const void* linkedFunctionIndex = _ctx->userdata;
    int nArgs = m3_GetArgCount(f);
    int nRets = m3_GetRetCount(f);
    EM_ASM({
        const _sp = $0; // wasm3 stack
        const _mem = $1; // wasm3 heap
        const nArgs = $2;
        const nRets = $3;
        const linkedFunctionIndex = $4;
        const linkedFunction = Module.LinkedFunctions[linkedFunctionIndex];
        const args = [];
        for (let i = 0; i < nArgs; i++) {
            const argType = linkedFunction.signature[2+i];
            switch(argType) {
                case 'i':
                    args.push(Module.HEAPU32[(_sp + (nRets + i) * 8) >> 2]);
                    break;
                case '*':
                    const offset = Module.HEAPU32[(_sp + (nRets + i) * 8)>> 2];
                    args.push(_mem + offset);
                    break;
                default:
                    throw new Erorr('unknown type');
            }
        }
        linkedFunction.run.apply(_mem, args);
    }, _sp, _mem, nArgs, nRets, linkedFunctionIndex);
    m3ApiSuccess();
}

EMSCRIPTEN_KEEPALIVE
M3Result link_function(IM3Module      io_module,
                const char * const    i_moduleName,
                const char * const    i_functionName,
                const char * const    i_signature,
                const void* linkedFunctionIndex) {
    M3Result err = m3_LinkRawFunctionEx(io_module, i_moduleName, i_functionName, i_signature, CallImport, linkedFunctionIndex);
    if (err) {
        js_ShowError(err);
    }
    return 0;
}
