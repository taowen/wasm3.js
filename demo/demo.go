package main

//export runDemo
func runDemo(ptrString uint32, length uint32) {
	bytes := make([]byte, length)
	copyBytesFromJsToGo(&bytes[0], ptrString, length)
	println(string(bytes))
}

//import copyBytesFromJsToGo
func copyBytesFromJsToGo(dst *byte, src uint32, length uint32)
