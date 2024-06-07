package main

import (
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	
	"github.com/btcsuite/btcd/btcutil"
	"github.com/alecthomas/kingpin"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"

	"bytes"
	"fmt"
)


func BuildMultiSigP2SHAddr(pubKeys []*PublicKey, m int) ([]byte, string, error) {
	builder := txscript.NewScriptBuilder()

	builder.AddOp(txscript.OP_1 + byte(m-1))

	for _, pubKey := range pubKeys {
		builder.AddData(pubKey.SerializeCompressed())
	}

	// add the total number of public keys in the multi-sig screipt
	builder.AddOp(txscript.OP_1 + byte(len(pubKeys)-1))
	// add the check-multi-sig op-code
	builder.AddOp(txscript.OP_CHECKMULTISIG)
	// redeem script is the script program in the format of []byte
	redeemScript, err := builder.Script()
	if err != nil {
		return nil, "", err
	}

	// calculate the hash160 of the redeem script
	redeemHash := btcutil.Hash160(redeemScript)

	// if using Bitcoin main net then pass &chaincfg.MainNetParams as second argument
	addr, err := btcutil.NewAddressScriptHashFromHash(redeemHash, &chaincfg.TestNet3Params)
	if err != nil {
		return nil, "", err
	}

	return redeemScript, addr.EncodeAddress(), nil

}

func SpendMultiSig(wifStrs []string, redeemScript []byte, uxto string, sentAddr string) ([]byte, string, error) {
	privKeys := make([]*PrivateKey, len(wifStrs))
	for i, wifStr := range wifStrs {
		wif, err := btcutil.DecodeWIF(wifStr)
		if err != nil {
			return nil, "", err
		}
		privKeys[i] = wif.PrivKey
	}

	redeemTx := wire.NewMsgTx(wire.TxVersion)

	// you should provide your UTXO hash
	utxoHash, err := chainhash.NewHashFromStr(uxto)
	if err != nil {
		return nil, "", nil
	}

	// and add the index of the UTXO
	outPoint := wire.NewOutPoint(utxoHash, 0)

	txIn := wire.NewTxIn(outPoint, nil, nil)

	redeemTx.AddTxIn(txIn)

	// adding the output to tx
	decodedAddr, err := btcutil.DecodeAddress(sentAddr, &chaincfg.TestNet3Params)
	if err != nil {
		return nil, "", err
	}
	destinationAddrByte, err := txscript.PayToAddrScript(decodedAddr)
	if err != nil {
		return nil, "", err
	}

	// adding the destination address and the amount to the transaction
	redeemTxOut := wire.NewTxOut(1, destinationAddrByte)
	redeemTx.AddTxOut(redeemTxOut)

	// signing the tx
	sigs := make([][]byte, len(privKeys))
	for i := 0; i < len(privKeys); i++ {
		sig, err := txscript.RawTxInSignature(redeemTx, 0, redeemScript, txscript.SigHashAll, privKeys[i])
		if err != nil {
			return nil, "", err
		}
		sigs[i] = sig

	}

	signature := txscript.NewScriptBuilder()
	signature.AddOp(txscript.OP_FALSE)
	// Add the signatures
	for _, sig := range sigs {
		signature.AddData(sig)
	}
	signature.AddData(redeemScript)

	signatureScript, err := signature.Script()
	if err != nil {
		// Handle the error.
		return nil, "", err
	}

	redeemTx.TxIn[0].SignatureScript = signatureScript

	var signedTx bytes.Buffer
	redeemTx.Serialize(&signedTx)

	hexSignedTx := hex.EncodeToString(signedTx.Bytes())

	return signedTx.Bytes(), hexSignedTx, nil
}

func Fund_(rawTxBytes []byte) {
	connCfg := &rpcclient.ConnConfig{
		Host:         "127.0.0.1:18333",
		User:         "your_rpc_username",
		Pass:         "your_rpc_password",
		HTTPPostMode: true, // Bitcoin core only supports HTTP POST mode
		DisableTLS:   true, // Bitcoin core does not provide TLS by default
	}
	//client, err := rpcclient.New(connCfg, nil)
	client, err := rpcclient.New(connCfg, &rpcclient.NotificationHandlers{})
	if err != nil {
		panic(err)
	}
	defer client.Shutdown()

	// Decode raw transaction
	var msgTx wire.MsgTx
	txReader := bytes.NewReader(rawTxBytes)
	err = msgTx.Deserialize(txReader)
	if err != nil {
		panic(err)
	}

	// Broadcast the transaction
	txHash, err := client.SendRawTransaction(&msgTx, false)
	if err != nil {
		panic(err)
	}
	fmt.Println("Transaction Hash:", txHash.String())
}

// create private keys, public keys, wifs
func CreateKeys(n int) ([]*PrivateKey, []*PublicKey, []*WIF) {
	privKeys := make([]*PrivateKey, n)
	for i := 0; i < n; i++ {
		privKey, err := NewPrivateKey()

		if err != nil {
			panic(err)
		}
		privKeys[i] = privKey
	}

	pubKeys := make([]*PublicKey, n)
	for i := 0; i < n; i++ {
		pubKeys[i] = NewPublicKey(privKeys[i])
	}

	wifs := make([]*WIF, n)
	for i := 0; i < n; i++ {
		wif, err := NewWIF(privKeys[i])
		if err != nil {
			panic(err)
		}
		wifs[i] = wif
	}
	return privKeys, pubKeys, wifs
}

func Fund(wifStrs []string, m int, uxto string, sentAddr string) {
	pubKeys := make([]*PublicKey, len(wifStrs))
	for i := 0; i < len(wifStrs); i++ {
		wif, err := btcutil.DecodeWIF(wifStrs[i])
		if err != nil {
			panic(err)
		}
		pubKeys[i] = wif.PrivKey.PubKey()
	}

	redeemScript, addr, _ := BuildMultiSigP2SHAddr(pubKeys, m)
	fmt.Println(addr)
	signedTx, hexSignedTx, _ := SpendMultiSig(wifStrs[:m], redeemScript, uxto, sentAddr) //"52f79863ae6746a0fb8e7cdf2d847790dd805370c011a9c0cda7562f65a198f8", " mv4rnyY3Su5gjcDNzbMLKBQkBicCtHUtFB")

	fmt.Println(hexSignedTx)
	broadcastTx(signedTx)

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

	_, addr, _ := BuildMultiSigP2SHAddr(pubKeys, m)

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

func broadcastTx(signedTx []byte) {
	url := "https://api.blockcypher.com/v1/btc/test3/txs/push"

	// Prepare the JSON payload
	data := map[string]string{"tx": fmt.Sprintf("%x", signedTx)} // Convert to hex string
	jsonPayload, err := json.Marshal(data)
	if err != nil {
		fmt.Println("Error creating JSON payload:", err)
		return
	}

	// Create the POST request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return
	}
	defer resp.Body.Close()

	// Decode the response (optional, but useful for debugging)
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	fmt.Println(result)
}

var (
	app = kingpin.New("go-multisig", "A Bitcoin multisig transaction builder built in Go")

	//keys subcommand
	cmdKeys      = app.Command("keys", "Generate public/private key pairs valid for use on Bitcoin network.")
	cmdKeysCount = cmdKeys.Arg("count", "Number of key pairs to generate.").Required().Int()

	//address subcommand
	cmdAddress        = app.Command("address", "Generate a multisig address from a list of public keys.")
	cmdAddressM       = cmdAddress.Arg("m", "M, the minimum number of keys needed to spend Bitcoin in M-of-N multisig transaction.").Required().Int()
	cmdAddressPubKeys = cmdAddress.Arg("pubkeys", "List of public keys to use in the multisig transaction.").Required().Strings()

	//fund subcommand
	cmdFund           = app.Command("fund", "Fund a multisig address.")
	cmdFundPrivateKey = cmdFund.Arg("privatekey", "Private key to use in the multisig transaction.").Required().Strings()
)

func main() {
	//privKeys, pubKeys, wifs := createkeys()
	//privKeys :=  [0xc00050a060, 0xc00050a0e0, 0xc00050a160, 0xc00050a1e0, 0xc00050a260, 0xc00050a2e0, 0xc00050a360, 0xc00050a3e0]
	//pubKeys := make([]*PublicKey, 8)
	// wifStrs := []string{
	// 	"cQoFjMB3yQwXVevKdXzeUa5X31j6yfCGxvEtQ54pYa2xuSAdHQBZ",
	// 	"cNsDcQF8QCwRxnKN6KdQaNtw87Hp1WiZbfeJ5B7cp7qHhz5YBcVt",
	// 	"cVNXqF2RzEggsS51pzjYnZUwYPAKyV5oV5n4Sqjom2JffY9sdaNx",
	// 	"cMz8MJNNTQ5oKiAKHN1Vnw569s3iP2XubqCvCwSfoinsxsB8ceBz",
	// 	"cMt1Fos1vJMAkrKriyFVDmWYf8DmjDvCgEBF2ETBE8qYdyJBmN31",
	// 	"cNAJ8qXNrYht8y3bmg4PEoWCELQXPJqT7UCDCwPFNd5UgmsDfYiG",
	// 	"cPXHh9tBvqkEzH2pem6JiNMW9EnGKbXGjkRNRv7K8AK923xBPSji",
	// }

	// Fund(wifStrs, 5)
	WriteFile(7, 10)
	//broadcastTx()

}
