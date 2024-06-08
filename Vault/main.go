package main

import (
	"go-multisig/multisig"

	"os"
	"strconv"
	"fmt"
	"encoding/json"

)


// create private keys, public keys, wifs
func CreateKeys(n int) ([]*multisig.PrivateKey, []*multisig.PublicKey, []*multisig.WIF) {
	privKeys := make([]*multisig.PrivateKey, n)
	for i := 0; i < n; i++ {
		privKey, err := multisig.NewPrivateKey()

		if err != nil {
			panic(err)
		}
		privKeys[i] = privKey
	}

	pubKeys := make([]*multisig.PublicKey, n)
	for i := 0; i < n; i++ {
		pubKeys[i] = multisig.NewPublicKey(privKeys[i])
	}

	wifs := make([]*multisig.WIF, n)
	for i := 0; i < n; i++ {
		wif, err := multisig.NewWIF(privKeys[i])
		if err != nil {
			panic(err)
		}
		wifs[i] = wif
	}
	return privKeys, pubKeys, wifs
}



type MultisigResult struct {
	Address    string   `json:"address"`
	WalletType string   `json:"walletType"`
	Wif        []string `json:"witness"`
}

func WriteFile(m int, n int) {
	_, pubKeys, wif := CreateKeys(n)
	wifStrs := make([]string, n)
	for i := 0; i < n; i++ {
		wifStrs[i] = wif[i].String()
	}

	_, addr, _ := multisig.BuildMultiSigP2SHAddr(pubKeys, m)

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




// func help() {
// 	keysCmd := flag.NewFlagSet("keys", flag.ExitOnError)
//     keysCount := keysCmd.Int("count", 0, "Number of key pairs to generate (required)")

//     addressCmd := flag.NewFlagSet("address", flag.ExitOnError)
//     addressM := addressCmd.Int("m", 0, "Minimum keys for spending (required)")
//     addressPubKeys := addressCmd.String("pubkeys", "", "List of public keys (required)")

//     fundCmd := flag.NewFlagSet("fund", flag.ExitOnError)
//     fundPrivateKey := fundCmd.String("privatekey", "", "Private keys (comma-separated, required)")
//     fundM := fundCmd.Int("m", 0, "Minimum keys for spending (required)")
//     fundUtxo := fundCmd.String("utxo", "", "UTXO to spend (required)")
//     fundSentAddr := fundCmd.String("sentaddr", "", "Destination address (required)")

//     writeCmd := flag.NewFlagSet("write", flag.ExitOnError)
//     writeM := writeCmd.Int("m", 0, "Minimum keys for spending (required)")
//     writeN := writeCmd.Int("n", 0, "Total number of keys (required)")

//     // Usage Function
//     flag.Usage = func() {
//         fmt.Println("Usage: go-multisig [subcommand] [options]")
//         fmt.Println("Subcommands:")
//         fmt.Println("  keys\t\tGenerate public/private key pairs")
//         fmt.Println("  address\tGenerate a multisig address")
//         fmt.Println("  fund\t\tFund a multisig address")
//         fmt.Println("  write\t\tWrite results to a file")
//         fmt.Println("Options:")
//         flag.PrintDefaults()
//     }

// 	if len(os.Args) < 2 {
// 		flag.Usage()
// 		return
// 	}

// 	switch os.Args[1] {
// 	case "keys":
// 		keysCmd.Parse(os.Args[2:])
// 		if *keysCount == 0 {
// 			keysCmd.PrintDefaults()
// 			return
// 		}
// 		privKeys, pubKeys, wifs := CreateKeys(*keysCount)
// 		fmt.Println("Private Keys:")
// 		for _, privKey := range privKeys {
// 			fmt.Println(privKey)
// 		}
// 		fmt.Println("Public Keys:")
// 		for _, pubKey := range pubKeys {
// 			fmt.Println(pubKey)
// 		}
// 		fmt.Println("WIFs:")
// 		for _, wif := range wifs {
// 			fmt.Println(wif)
// 		}
// 	case "address":
// 		addressCmd.Parse(os.Args[2:])
// 		if *addressM == 0 || *addressPubKeys == "" {
// 			addressCmd.PrintDefaults()
// 			return
// 		}
// 		pubKeysStr := strings.Split(*addressPubKeys, ",")
// 		pubKeys := make([]*PublicKey, len(pubKeysStr))
// 		for i, pubKeyStr := range pubKeysStr {
// 			pubKey, err := btcec.ParsePubKey(pubKeyStr)
// 			if err != nil {
// 				fmt.Println("Error parsing public key:", err)
// 				return
// 			}
// 			pubKeys[i] = pubKey
// 		}
// 		redeemScript, addr, err := multisig.BuildMultiSigP2SHAddr(pubKeys, *addressM)
// 		if err != nil {
// 			fmt.Println("Error building multisig address:", err)
// 			return
// 		}
// 		fmt.Println("Address:", addr)
// 		fmt.Println("Redeem Script:", hex.EncodeToString(redeemScript))
// 	case "fund":
// 		fundCmd.Parse(os.Args[2:])
// 		if *fundPrivateKey == "" || *fundM == 0 || *fundUtxo == "" || *fundSentAddr == "" {
// 			fundCmd.PrintDefaults()
// 			return
// 		}
// 		privKeysStr := strings.Split(*fundPrivateKey, ",")
// 		signedTx, hexSignedTx, err := SpendMultiSig(privKeysStr, nil, *fundUtxo, *fundSentAddr)
// 		if err != nil {
// 			fmt.Println("Error spending multisig:", err)
// 			return
// 		}
// 		fmt.Println("Signed Transaction:", hexSignedTx)
// 		broadcastTx(signedTx)
// 	case "write":
// 		writeCmd.Parse(os.Args[2:])
// 		if *writeM == 0 || *writeN == 0 {
// 			writeCmd.PrintDefaults()
// 			return
// 		}
// 		WriteFile(*writeM, *writeN)
// 	default:
// 		flag.Usage()
// 	}
// }



func main() {
	
	//Fund(wifStrs, 3, "a83ea5737df2afa174a7d7a8e5b3a0bb116d8f19bb26a35989a5d81b5ae81aaa", "2NEK1JNgomGtJ8THkPreWuuHZgSdGJBLFBX")

	WriteFile(4, 8)
	
	// wifStrs := []string{
	// 	"cVw6L1hq8YAxv5XcL5x9jnaqZxVBdyBASpXyfyuXEL7vBJMiGVGg",
    //   "cQk7VXAN5gEWwvTnjBzuLbFPypeaE55i1nodwmZe4KvVYpaa4m1X",
    //   "cPR2GXNwsdq1q4HdTF3hvcpBghWPQEUZVCiCirLLrPKkUjfW3STj",
    //   "cVDb7nsBn2JMibWkCurXAJJCUxjQhEPFRRaDDFCwNJjauxKMrLMW",
    //   "cV3byUGzinWcaANzSEgjLih61jzPsuZnRfom6ifhDcUPb2KCprDm",
    //   "cUegtQQ5BhEcbbFdGn5NhjbVyMTQQzfJmFnnfh1FSggjheNvMZJk",
	// }
	//multisig.Fund(wifStrs, 6, "cc32f0c695ce083e86bdd8e67ad584bec8ad2a60a3a37b2c9a39f63d41979240", "2MtHmaghgtpXacrCKkAvwjAgP619q8sNQMA", "2N2H7mofocge5YwrLvrybjJ31QVS4B68wqy")
}

