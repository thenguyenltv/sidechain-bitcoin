package main

import (
	"log"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

func isTargetingSidechain(btcTx *wire.MsgTx) bool {
	for _, out := range btcTx.TxOut {
		_, addresses, _, err := txscript.ExtractPkScriptAddrs(out.PkScript, &chaincfg.TestNet3Params)
		if err != nil {
			log.Fatalf("Failed to extract addresses from transaction output: %v", err)
		}

		for _, addr := range addresses {
			if addr.EncodeAddress() == TARGET_ADDRESS {
				return true
			}
		}
	}
	return false
}
