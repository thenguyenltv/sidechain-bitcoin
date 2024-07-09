package main

import (
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
)

func connectToBitcoinCore() *rpcclient.Client {
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
	return btcClient
}

// Function to poll for block info based on block hash
func getBlockInfo(btcClient *rpcclient.Client, blockHash *chainhash.Hash) (BlockInfo, error) {
	block, err := btcClient.GetBlock(blockHash)
	if err != nil {
		return BlockInfo{}, fmt.Errorf("failed to get block: %v", err)
	}

	transactions := block.Transactions
	txHashes := make([]string, len(transactions))
	for i, tx := range transactions {
		txHashes[i] = tx.TxHash().String()
	}

	hBlock, err := btcClient.GetBlockVerboseTx(blockHash)
	if err != nil {
		log.Fatal(err)
	}

	blockInfo := BlockInfo{
		BlockHash:         blockHash.String(),
		BlockHeight:       hBlock.Height,
		MerkleRoot:        block.Header.MerkleRoot.String(),
		TransactionHashes: txHashes,
	}
	return blockInfo, nil
}

func blockHandler(btcClient *rpcclient.Client, w http.ResponseWriter, r *http.Request) {
	// Ensure method is POST
	if r.Method != "POST" {
		http.Error(w, "Method is not supported.", http.StatusMethodNotAllowed)
		return
	}

	// Read the body of the request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	// Convert body to a block hash
	blockHash, err := chainhash.NewHashFromStr(string(body))
	if err != nil {
		http.Error(w, "Invalid block hash", http.StatusBadRequest)
		return
	}

	// Get block info and add to global array
	// defer btcClient.Shutdown()
	blockInfo, err := getBlockInfo(btcClient, blockHash)
	if err != nil {
		http.Error(w, "Error fetching block info", http.StatusInternalServerError)
		return
	}
	blockInfos = append(blockInfos, blockInfo)

	// Update last block hash
	lastBlockHash = blockHash

	// Update last block height
	lastBlockHeight = blockInfo.BlockHeight

	// Check if the block contains the target address transaction
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

	fmt.Printf("New Bitcoin block: %s\n\n", body)
	// Respond to the client
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Block data received and processed"))
	defer r.Body.Close() // Close the request body
}

func startBlockNotificationServer(btcClient *rpcclient.Client) {
	http.HandleFunc("/block", func(w http.ResponseWriter, r *http.Request) {
		blockHandler(btcClient, w, r)
	})

	fmt.Println("Server listening on port 9485")
	if err := http.ListenAndServe(":9485", nil); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}
