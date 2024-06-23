package main

// import 	// zmq "github.com/pebbe/zmq4"
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

const TARGET_ADDRESS = "tb1pawsaghd45u8sunvxyzedhk22m0ddy7qez66n720p8zkwpm82rv3s8jud5u"

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

	// // Create a new ZMQ subscriber
	// subscriber, err := zmq.NewSocket(zmq.SUB)
	// if err != nil {
	// 	log.Fatalf("Failed to create ZMQ subscriber: %v", err)
	// }

	// // Connect to the ZMQ socket provided by Bitcoin Core
	// err = subscriber.Connect("tcp://127.0.0.1:28332")
	// if err != nil {
	// 	log.Fatalf("Failed to connect to ZMQ socket: %v", err)
	// }

	// // Subscribe to hashblock messages
	// err = subscriber.SetSubscribe("hashblock")
	// if err != nil {
	// 	log.Fatalf("Failed to subscribe to hashblock messages: %v", err)
	// }

	// Get the best block hash
	var lastBlockHash *chainhash.Hash
	// Get the height of the last block
	var lastBlockHeight int64
	// Get the Block including TARGET_ADDRESS
	var blockTargets []*wire.MsgBlock = make([]*wire.MsgBlock, 0)
	// Poll for new Bitcoin blocks every 10 seconds
	// go func() {
	// 	for {
	// 		// Receive the topic
	// 		topic, err := subscriber.Recv(0)
	// 		if err != nil {
	// 			log.Fatalf("Failed to receive ZMQ message: %v", err)
	// 		}

	// 		// Receive the message
	// 		msg, err := subscriber.Recv(0)
	// 		if err != nil {
	// 			log.Fatalf("Failed to receive ZMQ message: %v", err)
	// 		}

	// 		// Handle the block hash
	// 		if topic == "hashblock" {
	// 			blockHash := msg

	// 			if lastBlockHash == nil || *blockHash != *lastBlockHash {
	// 				fmt.Printf("New Bitcoin block: %s\n", blockHash)

	// 				tmpBlock, err := btcClient.GetBlock(blockHash)
	// 				if err != nil {
	// 					log.Fatalf("Failed to get block: %v", err)
	// 				}
	// 				haveTarget := false
	// 				for _, tx := range tmpBlock.Transactions {
	// 					if isTargetingSidechain(tx) {
	// 						blockTarget = tmpBlock
	// 						haveTarget = true
	// 						break
	// 					}
	// 				}
	// 				if !haveTarget {
	// 					fmt.Println("No target transaction in this block")
	// 					blockTarget = nil
	// 				}
	// 				lastBlockHash = blockHash
	// 			}

	// 			// Get the height of the last block
	// 			block, err := btcClient.GetBlockVerboseTx(lastBlockHash)
	// 			if err != nil {
	// 				log.Fatal(err)
	// 			}
	// 			lastBlockHeight = block.Height
	// 		}
	// 	}
	// }()
	go func() {
		for {
			blockHash, err := btcClient.GetBestBlockHash()
			if err != nil {
				log.Fatalf("Failed to get best block hash: %v", err)
			}

			if lastBlockHash == nil || *blockHash != *lastBlockHash {
				fmt.Printf("New Bitcoin block: %s\n", blockHash)

				tmpBlock, err := btcClient.GetBlock(blockHash)
				if err != nil {
					log.Fatalf("Failed to get block: %v", err)
				}
				haveTarget := false
				for _, tx := range tmpBlock.Transactions {
					if isTargetingSidechain(tx) {
						fmt.Println("Found target transaction in this block")
						blockTargets = append(blockTargets, tmpBlock)
						haveTarget = true
						break
					}
				}
				if !haveTarget {
					fmt.Println("No target transaction in this block")
				}
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
		BlockHash         string
		BlockHeight       int64
		MerkleRoot        string
		TransactionHashes []string
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
			BlockHash:   blockHash.String(),
			BlockHeight: lastBlockHeight,
			MerkleRoot:  block.Header.MerkleRoot.String(),
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

	// API: /new-target-tnx
	// Usage: http://localhost:8080/new-target-tnx
	http.HandleFunc("/new-target-tnx", func(w http.ResponseWriter, r *http.Request) {
		if len(blockTargets) == 0 || *lastBlockHash != blockTargets[len(blockTargets)-1].BlockHash() {
			http.Error(w, "No target block available", http.StatusNotFound)
			return
		}

		// Get the latest block target
		blockTarget := blockTargets[len(blockTargets)-1]

		// Get the block hash, Merkle root, and transaction hashes
		blockInfo := BlockInfo{
			BlockHash:   lastBlockHash.String(),
			BlockHeight: lastBlockHeight,
			MerkleRoot:  blockTarget.Header.MerkleRoot.String(),
		}

		// Iterate over the transactions in the block to get their hashes
		for _, tx := range blockTarget.Transactions {
			blockInfo.TransactionHashes = append(blockInfo.TransactionHashes, tx.TxHash().String())
		}

		// Marshal the blockInfo + TargetTnx struct to JSON
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
