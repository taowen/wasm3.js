package main

import (
	jsoniter "github.com/json-iterator/tinygo"
)

type Product struct {
	Name  string `json:"name"`
	Price int    `json:"price"`
}

func ProductQuery(bytes []byte) []Product {
	products := []Product{}
	iter := jsoniter.ParseBytes(bytes)
	for iter.ReadArray() {
		product := Product{}
		for true {
			field := iter.ReadObject()
			if field == "name" {
				product.Name = iter.ReadString()
			} else if field == "price" {
				product.Price = iter.ReadInt()
			} else if field == "" {
				break
			} else {
				iter.Skip()
			}
		}
		products = append(products, product)
	}
	if iter.Error != nil {
		panic(iter.Error.Error())
	}
	return products
}

//export runDemo
func runDemo(ptrString uint32, length uint32) {
	bytes := make([]byte, length)
	copyBytesFromJsToGo(&bytes[0], ptrString, length)
	products := ProductQuery(bytes)
	println(len(products))
	println(products[0].Name)
}

//import copyBytesFromJsToGo
func copyBytesFromJsToGo(dst *byte, src uint32, length uint32)
