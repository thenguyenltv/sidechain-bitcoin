package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
)



type TransactionOutput struct {
	Value_    int64    `json:"value"`
	Script_   string   `json:"script"`
	Spent_by_ string   `json:"spent_by"`
	Address_  []string `json:"addresses"`
}
type TransactionInput struct {
	Address_      string   `json:"addresses"`
	Age_          int      `json:"age"`
	Output_index_ int      `json:"output_index"`
	Output_value_ int64    `json:"output_value"`
	Prev_hash_    string   `json:"prev_hash"`
	Script_type_  string   `json:"script_type"`
	Sequence_     int      `json:"sequence"`
	Witness_      []string `json:"witness"`
}
type Transaction struct {
	Address_      string              `json:"addresses"`
	Block_hash_   string              `json:"block_hash"`
	Block_height_ int                 `json:"block_height"`
	Block_index_  int                 `json:"block_index"`
	Confidence_   float64             `json:"confidence"`
	Confirmation_ int                 `json:"confirmations"`
	Confirmed_    string              `json:"confirmed"`
	Double_spend_ bool                `json:"double_spend"`
	Fees_         int64               `json:"fees"`
	Hash_         string              `json:"hash"`
	Inputs_       []TransactionInput  `json:"inputs"`
	Lock_time_    int                 `json:"lock_time"`
	Opt_in_rbf_   bool                `json:"opt_in_rbf"`
	Output_       []TransactionOutput `json:"outputs"`
	Preference_   string              `json:"preference"`
	Received_     string              `json:"received"`
	Size_         int                 `json:"size"`
	Total_        int64               `json:"total"`
	Ver_          int                 `json:"ver"`
	Vin_sz_       int                 `json:"vin_sz"`
	Vout_sz_      int                 `json:"vout_sz"`
	Vsize_        int                 `json:"vsize"`
}

func GetJson(url string, target interface{}) error {
	var myClient = &http.Client{Timeout: 10 * time.Second}

	resp, err := myClient.Get(url)
	if err != nil {
		fmt.Println("Error getting transaction:", err)
		return fmt.Errorf("error decoding JSON response: %v", err)
	}
	defer resp.Body.Close()
	//fmt.Println(json.NewDecoder(resp.Body).Decode(target))
	return json.NewDecoder(resp.Body).Decode(target)
}

func ParseTransaction(utxo string, sentAddr string) (int, int64) {
	url := "http://api.blockcypher.com/v1/btc/test3/txs/" + utxo

	tx := new(Transaction)
	GetJson(url, tx)
	
	for i, output := range tx.Output_ {
		fmt.Println(output.Address_[0])
		if output.Address_[0] == sentAddr {
			return i, output.Value_
		}
	}

	return -1, 0
}



type MultisigResult struct {
	Address    string   `json:"address"`
	WalletType string   `json:"walletType"`
	Wif        []string `json:"witness"`
}

func WriteFile(addr string, m int, n int, wifStrs []string) {
	result := MultisigResult{
		Address:    addr,
		WalletType: strconv.Itoa(m) + "-of-" + strconv.Itoa(n),
		Wif:        wifStrs,
	}
	fileName := "multisig_result.json"
	existingData, err := os.ReadFile(fileName)
	if err != nil && !os.IsNotExist(err) {
		fmt.Println("Error reading file:", err)
		return
	}

	var results []MultisigResult
	if len(existingData) > 0 {
		// Check if the existing data is an array or an object
		if existingData[0] == '[' { // Array
			if err := json.Unmarshal(existingData, &results); err != nil {
				fmt.Println("Error unmarshalling existing array data:", err)
				return
			}
		} else { // Object (single result)
			var singleResult MultisigResult
			if err := json.Unmarshal(existingData, &singleResult); err != nil {
				fmt.Println("Error unmarshalling existing object data:", err)
				return
			}
			results = append(results, singleResult) // Convert to a slice
		}
	}

	// Append new result
	results = append(results, result)

	// Marshal the updated data
	jsonData, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		fmt.Println("Error marshalling to JSON:", err)
		return
	}

	// Write (or overwrite) the file
	err = os.WriteFile(fileName, jsonData, 0644)
	if err != nil {
		fmt.Println("Error writing to file:", err)
		return
	}

	fmt.Println("Results written to", fileName)
}