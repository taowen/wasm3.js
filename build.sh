source ./emsdk/emsdk_env.sh --build=Release
emcc \
    wasm3/source/m3_bind.c \
    wasm3/source/m3_code.c \
    wasm3/source/m3_compile.c \
    wasm3/source/m3_core.c \
    wasm3/source/m3_env.c \
    wasm3/source/m3_exec.c \
    wasm3/source/m3_function.c \
    wasm3/source/m3_info.c \
    wasm3/source/m3_module.c \
    wasm3/source/m3_parse.c \
    wasm3.c \
    -I wasm3/source \
    -o wasm3.js \
    -O3 -s WASM=1 \
    -s ASSERTIONS=0 -s ENVIRONMENT='node' \
    -s JS_MATH=1 -s WASM_ASYNC_COMPILATION=0 \
    -s MODULARIZE=1 -s EXPORT_ES6=0 \
    -s FILESYSTEM=0 -s SINGLE_FILE=1 \
    -s ALLOW_MEMORY_GROWTH=1 -s ALLOW_TABLE_GROWTH=1 \
    -s INCOMING_MODULE_JS_API=[] -s DYNAMIC_EXECUTION=0 \
    -s EXPORTED_FUNCTIONS=["_malloc","_free"] \
    -Werror --memory-init-file 0 \