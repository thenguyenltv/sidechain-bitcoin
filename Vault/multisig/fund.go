package multisig

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/btcsuite/btcd/btcutil"
)

func Fund(wifStrs []string, m int, uxto string, sentAddr string, recvAddr string) {
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
	
	signedTx, hexSignedTx, _ := SpendMultiSig(wifStrs[:m], redeemScript, uxto, sentAddr, recvAddr) //"52f79863ae6746a0fb8e7cdf2d847790dd805370c011a9c0cda7562f65a198f8", " mv4rnyY3Su5gjcDNzbMLKBQkBicCtHUtFB")

	fmt.Println(hexSignedTx)
	broadcastTx(signedTx)

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
	//fmt.Println(bytes.NewBuffer(jsonPayload))
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