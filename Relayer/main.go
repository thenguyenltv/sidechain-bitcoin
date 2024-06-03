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

	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/wire"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

var latestBlock *types.Block

func relayTxToSidechain(ethClient *ethclient.Client, tx *types.Transaction) error {
	// TODO: Implement this function
	return nil
}

func convertToEthTransaction(btcTx *wire.MsgTx) *types.Transaction {
	// TODO: Implement conversion from *wire.MsgTx to *types.Transaction
	return nil
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

	// Connect to Ethereum sidechain
	ethClient, err := ethclient.Dial("ws://127.0.0.1:8545")
	if err != nil {
		log.Fatal(err)
	}

	// Poll for new Bitcoin blocks every 10 seconds
	go func() {
		var lastBlockHash *chainhash.Hash
		for {
			blockHash, err := btcClient.GetBestBlockHash()
			if err != nil {
				log.Fatalf("Failed to get best block hash: %v", err)
			}

			if lastBlockHash == nil || *blockHash != *lastBlockHash {
				fmt.Printf("New Bitcoin block: %s\n", blockHash)

				block, err := btcClient.GetBlock(blockHash)
				if err != nil {
					log.Fatalf("Failed to get block: %v", err)
				}

				for _, tx := range block.Transactions {
					ethTx := convertToEthTransaction(tx)
					err := relayTxToSidechain(ethClient, ethTx)
					if err != nil {
						log.Fatalf("Failed to relay transaction to sidechain: %v", err)
					}
				}

				lastBlockHash = blockHash
			}

			time.Sleep(10 * time.Second)
		}
	}()

	// Expose a RESTful API
	http.HandleFunc("/latest-block", func(w http.ResponseWriter, r *http.Request) {
		blockJson, err := json.Marshal(latestBlock)
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
