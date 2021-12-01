package main

import "encoding/json"

type Product struct {
	Name  string `json:"name"`
	Price int    `json:"price"`
}

//export runDemo
func runDemo(ptrString uint32, length uint32) {
	bytes := make([]byte, length)
	copyBytesFromJsToGo(&bytes[0], ptrString, length)
	products := []Product{}
	json.Unmarshal(bytes, &products)
}

//import copyBytesFromJsToGo
func copyBytesFromJsToGo(dst *byte, src uint32, length uint32)
