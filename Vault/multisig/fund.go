package multisig

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"go-multisig/utils"
)



func Fund(amount int64, sentAddr string, recvAddr string) {
	// Get the redeem script from the sending address info
	disasmRedeemscript := utils.ReadNeededMultisigInfo(sentAddr)
	redeemScript := utils.ParseDiasmRedeemScript(disasmRedeemscript)

	
	signedTx, _ := CreateRawTx(redeemScript, amount, sentAddr, recvAddr)

	broadcastTx(signedTx)
}

func broadcastTx(rawTx string) {
	//url := "https://mempool.space/testnet/api/tx"
	url := "https://blockstream.info/testnet/api/tx"

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

	if resp.StatusCode != http.StatusOK {
		fmt.Println("\033[31mERROR: ", string(body), "\033[0m")
	} else {
		fmt.Println("\033[32mSUCCESS. CHECKOUT TRANSACTION ID: ", string(body), "\033[0m")
	}

}
