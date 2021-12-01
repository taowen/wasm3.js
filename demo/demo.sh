pushd ..
./build.sh
popd
tinygo build -no-debug -gc=leaking -target=wasm -scheduler=none -o demo.wasm ./demo.go
node demo.js