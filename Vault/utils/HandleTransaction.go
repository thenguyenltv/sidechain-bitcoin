package utils

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/txscript"
)


type Transaction struct {
	Txid     string `json:"txid"`
	Version  int    `json:"version"`
	Locktime int    `json:"locktime"`
	Vin      []struct {
		Txid    string `json:"txid"`
		Vout    int    `json:"vout"`
		Prevout struct {
			Scriptpubkey        string `json:"scriptpubkey"`
			ScriptpubkeyAsm     string `json:"scriptpubkey_asm"`
			ScriptpubkeyType    string `json:"scriptpubkey_type"`
			ScriptpubkeyAddress string `json:"scriptpubkey_address"`
			Value               int64  `json:"value"`
		} `json:"prevout"`
		Scriptsig    string   `json:"scriptsig"`
		ScriptsigAsm string   `json:"scriptsig_asm"`
		Witness      []string `json:"witness"`
		IsCoinbase   bool     `json:"is_coinbase"`
		Sequence     int64    `json:"sequence"`
	} `json:"vin"`
	Vout []struct {
		Scriptpubkey        string `json:"scriptpubkey"`
		ScriptpubkeyAsm     string `json:"scriptpubkey_asm"`
		ScriptpubkeyType    string `json:"scriptpubkey_type"`
		ScriptpubkeyAddress string `json:"scriptpubkey_address"`
		Value               int    `json:"value"`
	} `json:"vout"`
	Size   int `json:"size"`
	Weight int `json:"weight"`
	Sigops int `json:"sigops"`
	Fee    int `json:"fee"`
	Status struct {
		Confirmed   bool   `json:"confirmed"`
		BlockHeight int    `json:"block_height"`
		BlockHash   string `json:"block_hash"`
		BlockTime   int    `json:"block_time"`
	} `json:"status"`
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
	url := "https://mempool.space/testnet/api/tx/" + utxo

	tx := new(Transaction)
	GetJson(url, tx)
	
	for i, output := range tx.Vout {
		//fmt.Println(output.ScriptpubkeyAddress)
		if output.ScriptpubkeyAddress == sentAddr {
			return i, int64(output.Value)
		}
	}

	return -1, 0
}

type MultiSigRedeemScript struct {
	Address            string `json:"address"`
	DisasmRedeemscript string `json:"disasmRedeemscript"`
}

func WriteNeededMultisigInfo(addr string, redeemScript []byte) {
	disasmRedeemsScript, err := txscript.DisasmString(redeemScript)
	
	if err != nil {
		fmt.Println("error disassembling redeem script")
	}

	result := MultiSigRedeemScript{
		Address:    addr,
		DisasmRedeemscript:	disasmRedeemsScript,
	}

	fileName := "vault_address_info.json"
	existingData, err := os.ReadFile(fileName)
	if err != nil && !os.IsNotExist(err) {
		fmt.Println("Error reading file:", err)
		return
	}

	var results []MultiSigRedeemScript
	if len(existingData) > 0 {
		// Check if the existing data is an array or an object
		if existingData[0] == '[' { // Array
			if err := json.Unmarshal(existingData, &results); err != nil {
				fmt.Println("Error unmarshalling existing array data:", err)
				return
			}
		} else { // Object (single result)
			var singleResult MultiSigRedeemScript
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

// Read file vault_address_info.json and get disasmRedeemscript match the address
func ReadNeededMultisigInfo(addr string) string {
	fileName := "vault_address_info.json"
	existingData, err := os.ReadFile(fileName)
	if err != nil && !os.IsNotExist(err) {
		fmt.Println("Error reading file:", err)
		return ""
	}

	var results []MultiSigRedeemScript
	if len(existingData) > 0 {
		// Check if the existing data is an array or an object
		if existingData[0] == '[' { // Array
			if err := json.Unmarshal(existingData, &results); err != nil {
				fmt.Println("Error unmarshalling existing array data:", err)
				return ""
			}
		} else { // Object (single result)
			var singleResult MultiSigRedeemScript
			if err := json.Unmarshal(existingData, &singleResult); err != nil {
				fmt.Println("Error unmarshalling existing object data:", err)
				return ""
			}
			results = append(results, singleResult) // Convert to a slice
		}
	}

	for _, result := range results {
		if result.Address == addr {
			return result.DisasmRedeemscript
		}
	}

	return ""
}


func ParseDiasmRedeemScript(disasmRedeemscript string) []byte{
	parts := strings.Split(disasmRedeemscript, " ")

	m, _ := strconv.Atoi(parts[0])
	n, _ := strconv.Atoi(parts[len(parts) - 2])
		
	builder := txscript.NewScriptBuilder()

	builder.AddOp(txscript.OP_1 + byte(m - 1))


	for i := 1; i < len(parts) - 2; i++ {
		pubKeyStr, _ := hex.DecodeString(parts[i])
		pubKeyByte, err := btcec.ParsePubKey(pubKeyStr)
		
		if err != nil {
			fmt.Println("Error parsing public key:", err)
			return nil
		}
		builder.AddData(pubKeyByte.SerializeCompressed())
	}

	builder.AddOp(txscript.OP_1 + byte(n - 1))

	builder.AddOp(txscript.OP_CHECKMULTISIG)

	redeemScript, err := builder.Script()
	if err != nil {
		fmt.Println("Error building redeem script:", err)
		return nil
	}

	return redeemScript
}


//These 2 function just to store multisig result to json file for testing, will be delete later
type MultisigResult struct {
	Address    string   `json:"address"`
	WalletType string   `json:"walletType"`
	Wif        []string `json:"wifs"`
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