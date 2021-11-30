pushd ..
./build.sh
popd
tinygo build -o demo.wasm -target wasm ./demo.go
node demo.js