package main

import "github.com/btcsuite/btcd/wire"

// raw transion with 4 fields
type RawTransaction struct {
	Hash     string
	Ver      string
	Vin      string
	Vout     string
	Locktime string
}

// Thông tin Block ở dạng thô (msg)
type BlockData struct {
	Block           *wire.MsgBlock
	RawTransactions []*wire.MsgTx
}

// BlockInfo chứa thông tin về một block
type BlockInfo struct {
	BlockHash         string
	BlockHeight       int64
	MerkleRoot        string
	TransactionHashes []string
	RawTxs            []*RawTransaction
}

// Global array to hold block information
var blockInfos []BlockInfo
