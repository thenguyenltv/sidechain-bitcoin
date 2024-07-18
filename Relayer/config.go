package main

import (
	"github.com/btcsuite/btcd/chaincfg/chainhash"
)

const TARGET_ADDRESS = "mkn4Txu4v9efkbVehjK4hydJhBBpbv6HuA"

var (
	lastBlockHash   *chainhash.Hash
	lastBlockHeight int64
	blockTargets    []*BlockData // MsgBlock and its raw transactions
)
