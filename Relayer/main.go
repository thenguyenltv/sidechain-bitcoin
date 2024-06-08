package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

const TARGET_ADDRESS = "0xaddress"

func isTargetingSidechain(btcTx *wire.MsgTx) bool {
	// Check each output of the transaction
	for _, out := range btcTx.TxOut {
		// Get the Bitcoin address of the output
		_, addresses, _, err := txscript.ExtractPkScriptAddrs(out.PkScript, &chaincfg.TestNet3Params)
		if err != nil {
			log.Fatalf("Failed to extract addresses from transaction output: %v", err)
		}

		// Check if any of the addresses are in the address map
		for _, addr := range addresses {
			if addr.EncodeAddress() == TARGET_ADDRESS {
				// This transaction is targeting the side chain
				return true
			}
		}
	}

	// This transaction is not targeting the side chain
	return false
}

func main() {
	// Connect to Bitcoin Core
	connCfg := &rpcclient.ConnConfig{
		Host:         "localhost:18332",
		User:         "test",
		Pass:         "test",
		HTTPPostMode: true,
		DisableTLS:   true,
	}
	btcClient, err := rpcclient.New(connCfg, nil)
	if err != nil {
		log.Fatal(err)
	}

	var lastBlockHash *chainhash.Hash
	// Poll for new Bitcoin blocks every 10 seconds
	go func() {
		for {
			blockHash, err := btcClient.GetBestBlockHash()
			if err != nil {
				log.Fatalf("Failed to get best block hash: %v", err)
			}

			if lastBlockHash == nil || *blockHash != *lastBlockHash {
				fmt.Printf("New Bitcoin block: %s\n", blockHash)

				// block, err := btcClient.GetBlock(blockHash)
				// if err != nil {
				// 	log.Fatalf("Failed to get block: %v", err)
				// }
				// for _, tx := range block.Transactions {
				// 	if isTargetingSidechain(tx) {
				// 		continue
				// 	}
				// }
				lastBlockHash = blockHash
			}
			time.Sleep(10 * time.Second)
		}
	}()

	// Expose a RESTful API
	http.HandleFunc("/latest-block", func(w http.ResponseWriter, r *http.Request) {

		// Marshal the block to JSON
		blockJson, err := json.Marshal(lastBlockHash)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(blockJson)
	})

	go func() {
		log.Fatal(http.ListenAndServe(":8080", nil))
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	fmt.Println("Press CTRL+C to stop")
	<-stop

	fmt.Println("Unsubscribing...")
	time.Sleep(1 * time.Second)
	fmt.Println("Exiting...")
}
