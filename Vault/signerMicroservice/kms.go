package main

import (
	// ... imports as before
	"bytes"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/btcsuite/btcd/btcutil"

	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
	"github.com/gorilla/mux"
)

var (
    portFlag = flag.String("port", "8080", "Port number to listen on")
    keyFlag  = flag.String("key", "", "WIF-encoded private key to use for signing (required)")
)

type PartialSignature struct {
    SignerID    string `json:"signerId"`
    Signature   []byte `json:"signature"`
}

func decodeTxFromHex(txHex string) (*wire.MsgTx, error) {
    serializedTx, err := hex.DecodeString(txHex)
    if err != nil {
        return nil, fmt.Errorf("invalid hex string: %v", err)
    }

    var msgTx wire.MsgTx
    err = msgTx.Deserialize(bytes.NewReader(serializedTx))
    if err != nil {
        return nil, fmt.Errorf("Failed to deserialize transaction: %v", err)
    }

    return &msgTx, nil
}

// API endpoint for signing a transaction hash
func signTransactionHashHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Println("Received request to sign transaction hash")
    // Check if the key was provided
    if *keyFlag == "" {
        http.Error(w, "Missing private key (-key flag)", http.StatusBadRequest)
        return
    }

    wif, _ := btcutil.DecodeWIF(*keyFlag)
    privateKey := wif.PrivKey

    // Get the transaction hash from the request body
    var reqBody struct {
        RedeemTx        string  `json:"txHash"`
        RedeemScript    []byte  `json:"redeemScript"`
        TxInIndex       int     `json:"txInIndex"`
    }


    if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    redeemTx, err := decodeTxFromHex(reqBody.RedeemTx)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    signature, err := txscript.RawTxInSignature(redeemTx, reqBody.TxInIndex, reqBody.RedeemScript, txscript.SigHashAll, privateKey)
    if err != nil {
        log.Fatal(err)
    }

    partialSig := PartialSignature{
        SignerID: *portFlag, // Unique identifier for this signer
        Signature: signature,
    }
    jsonBytes, _ := json.Marshal(partialSig)
    w.Header().Set("Content-Type", "application/json")
    w.Write(jsonBytes)
}

func showHelpMenu() {
    fmt.Println("Usage:")
    fmt.Println("  signer.exe [options]")
    fmt.Println("\nOptions:")
    flag.PrintDefaults() // This will now print the help for both -port and -key
    fmt.Println("\nExample:")
    fmt.Println("  signer.exe -port 8000 -key your_privatekey_key_here")
}

func main() {
    flag.Parse()

    if len(os.Args) < 2 {
        showHelpMenu()
        return
    }

    // Create a new router
    router := mux.NewRouter()

    // Define routes for API endpoints
    router.HandleFunc("/sign", signTransactionHashHandler).Methods("POST")
    fmt.Println("Signer listening on :" + *portFlag)
    // Start the HTTP server
    http.ListenAndServe(":" + *portFlag, router)

    
}