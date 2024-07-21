package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// Data structure to send to signers
type SignRequest struct {
    TxHash 			string `json:"txHash"`
    RedeemScript 	[]byte `json:"redeemScript"`
    TxInIndex 		int `json:"txInIndex"`
}


// Data structure to store partial signatures
type PartialSignature struct {
    SignerID string `json:"signerId"`
    Signature []byte `json:"signature"`
}


func SendSignRequestToSigner(signerEndpoint string, req SignRequest, partialSignatures *[]PartialSignature) error {
    jsonBytes, err := json.Marshal(req)
    if err != nil {
        return err
    }

    resp, err := http.Post(signerEndpoint, "application/json", bytes.NewBuffer(jsonBytes))
    if err != nil || resp.StatusCode != http.StatusOK {
        return fmt.Errorf("failed to send sign request to %s: %v", signerEndpoint, err)
    }
	defer resp.Body.Close()

	var sig PartialSignature
    if err := json.NewDecoder(resp.Body).Decode(&sig); err != nil {
       return err
    }

    *partialSignatures = append(*partialSignatures, sig)
    fmt.Println("\033[34m  --> Signature received from: ", signerEndpoint, "\033[0m")
    return nil
}

// Function to send sign requests to all signers
func SendSignRequests(signerEndpoints []string, txIndex int, txHash string, redeemScript []byte, partialSignatures *[]PartialSignature) error {
    for _, endpoint := range signerEndpoints {
        req := SignRequest{
            TxHash:        txHash,
            RedeemScript:  redeemScript,
            TxInIndex:     txIndex, // Assuming one signature per input
        }
        if err := SendSignRequestToSigner(endpoint, req, partialSignatures); err != nil {
            return err
        }
    }
    return nil
}

