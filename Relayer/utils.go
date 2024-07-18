package main

import (
	"fmt"
	"log"
	"strings"

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

// Hàm chuyển đổi txIn thành chuỗi hex
func txInToHex(txIns []*wire.TxIn) string {
	var hexValues []string
	for _, txIn := range txIns {
		// Giả sử TxIn có một trường bạn muốn chuyển đổi, ví dụ: SignatureScript
		hexValues = append(hexValues, fmt.Sprintf("%x", txIn.SignatureScript))
	}
	return strings.Join(hexValues, ",")
}

// Hàm chuyển đổi txOut thành chuỗi hex
func txOutToHex(txOuts []*wire.TxOut) string {
	var hexValues []string
	for _, txOut := range txOuts {
		// Giả sử TxOut có một trường bạn muốn chuyển đổi, ví dụ: PkScript
		hexValues = append(hexValues, fmt.Sprintf("%x", txOut.PkScript))
	}
	return strings.Join(hexValues, ",")
}
