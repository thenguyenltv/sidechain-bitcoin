package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
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
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// This is a map of Bitcoin addresses to Ethereum addresses
var addressMap = map[string]string{
	"bitcoinTestnetAddress1": "ethereumAddress1",
	// Add more addresses here
}

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
			if _, ok := addressMap[addr.EncodeAddress()]; ok {
				// This transaction is targeting the side chain
				return true
			}
		}
	}

	// This transaction is not targeting the side chain
	return false
}

func convertToEthTransaction(btcTx *wire.MsgTx, ethClient *ethclient.Client) (*types.Transaction, error) {

	gasPrice, err := ethClient.SuggestGasPrice(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get gas price: %v", err)
	}

	return types.NewTransaction(
		0,                                // nonce
		common.HexToAddress("0xaddress"), // to address
		big.NewInt(0),                    // value
		21000,                            // gas limit
		gasPrice,                         // gas price
		nil,                              // data
	), nil
}

// RelayTxToSidechain sends an Ethereum transaction to the sidechain.
func relayTxToSidechain(ethClient *ethclient.Client, tx *types.Transaction) error {
	// Create a new signer to sign the transaction
	// This example assumes you have the private key available to sign the transaction
	privateKey, err := crypto.HexToECDSA("d353c36fa1e54cc443fdd4a55230b625886fc86c9d6153c7f0aed8c791a8e911")
	if err != nil {
		return fmt.Errorf("failed to load private key: %v", err)
	}

	// Sign the transaction
	signedTx, err := types.SignTx(tx, types.HomesteadSigner{}, privateKey)
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %v", err)
	}

	// Send the transaction
	err = ethClient.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return fmt.Errorf("failed to send transaction: %v", err)
	}

	fmt.Printf("Relayed Ethereum transaction: %s\n", signedTx.Hash().Hex())
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

	// Connect to Ethereum (Ganache)
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
					if isTargetingSidechain(tx) {
						ethTx, err := convertToEthTransaction(tx, ethClient) // Pass ethClient here
						if err != nil {
							log.Fatalf("Failed to convert Bitcoin transaction to Ethereum transaction: %v", err)
						}

						err = relayTxToSidechain(ethClient, ethTx)
						if err != nil {
							log.Fatalf("Failed to relay transaction to sidechain: %v", err)
						}
					}
				}

				lastBlockHash = blockHash
			}

			time.Sleep(10 * time.Second)
		}
	}()

	// Listen for new blocks on Ethereum (Ganache)
	headers := make(chan *types.Header)
	sub, err := ethClient.SubscribeNewHead(context.Background(), headers)
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		for {
			select {
			case err := <-sub.Err():
				log.Fatalf("Failed to subscribe to new Ethereum blocks: %v", err)
			case header := <-headers:
				block, err := ethClient.BlockByHash(context.Background(), header.Hash())
				if err != nil {
					log.Fatalf("Failed to get Ethereum block: %v", err)
				}

				fmt.Printf("New Ethereum block: %s\n", block.Hash().Hex())

			}
		}
	}()

	// Expose a RESTful API
	http.HandleFunc("/latest-block", func(w http.ResponseWriter, r *http.Request) {
		// Get the latest block from Bitcoin
		bestBlockHash, err := btcClient.GetBestBlockHash()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		block, err := btcClient.GetBlock(bestBlockHash)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Marshal the block to JSON
		blockJson, err := json.Marshal(block)
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
