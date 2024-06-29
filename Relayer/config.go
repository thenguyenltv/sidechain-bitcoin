package main

import (
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
)

const TARGET_ADDRESS = "mkn4Txu4v9efkbVehjK4hydJhBBpbv6HuA"

var (
	lastBlockHash   *chainhash.Hash
	lastBlockHeight int64
	blockTargets    []*wire.MsgBlock = make([]*wire.MsgBlock, 0)
)
