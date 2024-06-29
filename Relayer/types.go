package main

// BlockInfo chứa thông tin về một block
type BlockInfo struct {
	BlockHash         string
	BlockHeight       int64
	MerkleRoot        string
	TransactionHashes []string
}

// Global array to hold block information
var blockInfos []BlockInfo
