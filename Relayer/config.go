package main

import (
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
)

const TARGET_ADDRESS = "mkn4Txu4v9efkbVehjK4hydJhBBpbv6HuA"

// BlockData chứa thông tin của một block và các raw transactions của nó.
type BlockData struct {
	Block           *wire.MsgBlock
	RawTransactions []string // Hoặc []byte nếu bạn muốn lưu dưới dạng byte array
}

var (
	lastBlockHash   *chainhash.Hash
	lastBlockHeight int64
	blockTargets    []*BlockData
)
