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
	//height of the last block
	var lastBlockHeight int64
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

			// Get the height of the last block
			block, err := btcClient.GetBlockVerboseTx(lastBlockHash)
			if err != nil {
				log.Fatal(err)
			}
			lastBlockHeight = block.Height

			time.Sleep(10 * time.Second)
		}
	}()

	// Expose a RESTful API
	// API: /latest-block
	// Usage: http://localhost:8080/latest-block
	http.HandleFunc("/latest-block", func(w http.ResponseWriter, r *http.Request) {
		if lastBlockHash == nil {
			http.Error(w, "No block available", http.StatusNotFound)
			return
		}
		blockData := map[string]interface{}{
			"hash":   lastBlockHash.String(),
			"height": lastBlockHeight,
		}
		blockJson, err := json.Marshal(blockData)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(blockJson)
	})

	// Create a struct to hold the information we want to display
	type BlockInfo struct {
		BlockHash         string   `json:"block_hash"`
		MerkleRoot        string   `json:"merkle_root"`
		TransactionHashes []string `json:"transaction_hashes"`
	}

	// API: /get-block/:hash
	// Usage: http://localhost:8080/get-block/00000000dd38e6eac1b35139b7f14aff86983cd67da721453d64dacb7ca42157
	http.HandleFunc("/get-block/", func(w http.ResponseWriter, r *http.Request) {
		hash := r.URL.Path[len("/get-block/"):]

		blockHash, err := chainhash.NewHashFromStr(hash)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		block, err := btcClient.GetBlock(blockHash)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Get the block hash, Merkle root, and transaction hashes
		blockInfo := BlockInfo{
			BlockHash:  blockHash.String(),
			MerkleRoot: block.Header.MerkleRoot.String(),
		}

		// Iterate over the transactions in the block to get their hashes
		for _, tx := range block.Transactions {
			blockInfo.TransactionHashes = append(blockInfo.TransactionHashes, tx.TxHash().String())
		}

		// Marshal the blockInfo struct to JSON
		blockJson, err := json.Marshal(blockInfo)
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
