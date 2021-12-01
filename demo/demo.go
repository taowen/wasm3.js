package main

var counter = 0

//export runDemo
func runDemo() {
	println("hello", counter)
	counter = counter + 1
}
