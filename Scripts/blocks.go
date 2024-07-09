package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
)

// Use getblockhash form 0 to best block
func getBlockHashes(btcClient *rpcclient.Client) ([]*chainhash.Hash, error) {
	// Get the best block height
	bestBlockHeight, err := btcClient.GetBlockCount()
	if err != nil {
		return nil, fmt.Errorf("Failed to get best block height: %v", err)
	}

	// Get the block hash for each block from height 0 to the best block height
	blockHashes := make([]*chainhash.Hash, bestBlockHeight+1)
	for i := int64(0); i <= bestBlockHeight; i++ {
		blockHash, err := btcClient.GetBlockHash(i)
		if err != nil {
			return nil, fmt.Errorf("Failed to get block hash for block %d: %v", i, err)
		}
		blockHashes[i] = blockHash
		// print " block i: 0xabv...123"
		// print blockhash follow format 0xabv...123, get only 3 last characters
		newFormHash := blockHash.String()
		newFormHash = "0x" + newFormHash[0:3] + "..." + newFormHash[len(newFormHash)-3:]
		fmt.Printf("Block %d: %s\n", i, newFormHash)
	}

	return blockHashes, nil
}

const CONDITION = false

// Get all block hashes and write them to a file
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

	run := CONDITION
	// Retrieve all block hashes
	if run {
		blockHashes, err := getBlockHashes(btcClient)
		if err != nil {
			log.Fatal(err)
		}
		blockHashesJson, err := json.Marshal(blockHashes)
		if err != nil {
			log.Fatal(err)
		}
		err = os.WriteFile("blocks.json", blockHashesJson, 0644)
		if err != nil {
			log.Fatal(err)
		}
	} else {
		log.Println("Run is set to false, skipping block retrieval")
	}
}
