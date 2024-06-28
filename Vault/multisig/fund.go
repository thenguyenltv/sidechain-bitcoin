package multisig

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"go-multisig/utils"
	"github.com/btcsuite/btcd/btcutil"
)



func Fund(wifStrs []string, m int, amount int64, sentAddr string, recvAddr string) {
	pubKeys := make([]*PublicKey, len(wifStrs))
	for i := 0; i < len(wifStrs); i++ {
		wif, err := btcutil.DecodeWIF(wifStrs[i])
		if err != nil {
			panic(err)
		}
		pubKeys[i] = wif.PrivKey.PubKey()
	}


	disasmRedeemscript := utils.ReadNeededMultisigInfo(sentAddr)
	redeemScript := utils.ParseDiasmRedeemScript(disasmRedeemscript)

	signedTx, _, _ := SpendMultiSig(wifStrs[:m], redeemScript, amount, sentAddr, recvAddr)

	broadcastTx(signedTx)

}

func broadcastTx(signedTx []byte) {
	url := "https://mempool.space/testnet/api/tx"

	// Prepare for raw data
	rawTx := hex.EncodeToString(signedTx)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(rawTx)))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return
	}

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return
	}
	defer resp.Body.Close()

	// Decode the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response:", err)
		return
	}

	fmt.Println("Body: ", string(body))
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	fmt.Println("Result: ", result)
}
