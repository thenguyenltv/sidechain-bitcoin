package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
)

func setupHandlers(btcClient *rpcclient.Client) {
	http.HandleFunc("/latest-block", latestBlockHandler)
	http.HandleFunc("/get-block/", getBlockHandler(btcClient))
	http.HandleFunc("/new-target-tnx", newTargetTnxHandler)
	http.HandleFunc("/get-tnx/", getTnxHandler(btcClient))

	go func() {
		log.Fatal(http.ListenAndServe(":8080", nil))
	}()
}

func latestBlockHandler(w http.ResponseWriter, r *http.Request) {
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
}

func getBlockHandler(btcClient *rpcclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		blockInfo := BlockInfo{
			BlockHash:   blockHash.String(),
			BlockHeight: lastBlockHeight,
			MerkleRoot:  block.Header.MerkleRoot.String(),
		}

		for _, tx := range block.Transactions {
			blockInfo.TransactionHashes = append(blockInfo.TransactionHashes, tx.TxHash().String())
		}

		blockJson, err := json.Marshal(blockInfo)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(blockJson)
	}
}

func newTargetTnxHandler(w http.ResponseWriter, r *http.Request) {
	if len(blockTargets) == 0 || *lastBlockHash != blockTargets[len(blockTargets)-1].BlockHash() {
		http.Error(w, "No target block available", http.StatusNotFound)
		return
	}

	blockTarget := blockTargets[len(blockTargets)-1]

	blockInfo := BlockInfo{
		BlockHash:   lastBlockHash.String(),
		BlockHeight: lastBlockHeight,
		MerkleRoot:  blockTarget.Header.MerkleRoot.String(),
	}

	for _, tx := range blockTarget.Transactions {
		blockInfo.TransactionHashes = append(blockInfo.TransactionHashes, tx.TxHash().String())
	}

	blockJson, err := json.Marshal(blockInfo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(blockJson)
}

func getTnxHandler(btcClient *rpcclient.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hash := r.URL.Path[len("/get-tnx/"):]

		txid, err := chainhash.NewHashFromStr(hash)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		fmt.Print(txid)

		txRaw, err := btcClient.GetRawTransaction(txid)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// return the transaction as JSON
		txJson, err := json.Marshal(txRaw)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(txJson)
	}
}
