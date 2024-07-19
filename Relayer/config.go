package main

import (
	"github.com/btcsuite/btcd/chaincfg/chainhash"
)

const TARGET_ADDRESS = "2MvLZyMwcAju7snmtEHHUqVmzK2GmMwKzs1"

var (
	lastBlockHash   *chainhash.Hash
	lastBlockHeight int64
	blockTargets    []*BlockData // MsgBlock and its raw transactions
)
