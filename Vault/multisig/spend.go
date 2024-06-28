package multisig

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"

	//"go-multisig/utils"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

type AddressUTXO []struct {
	Txid   string `json:"txid"`
	Vout   int    `json:"vout"`
	Status struct {
		Confirmed   bool   `json:"confirmed"`
		BlockHeight int    `json:"block_height"`
		BlockHash   string `json:"block_hash"`
		BlockTime   int    `json:"block_time"`
	} `json:"status"`
	Value int64 `json:"value"`
}

type FeeRate struct {
	FastestFee  int64 `json:"fastestFee"`
	HalfHourFee int64 `json:"halfHourFee"`
	HourFee     int64 `json:"hourFee"`
	EconomyFee  int64 `json:"economyFee"`
	MinimumFee  int64 `json:"minimumFee"`
}

func GetUnspentUtxos(addr string) interface{} {
	url := "https://mempool.space/testnet/api/address/" + addr + "/utxo"
	resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error getting UTXO:", err)
		return nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading UTXO response:", err)
		return nil
	}

	var utxos AddressUTXO
	json.Unmarshal(body, &utxos)
	if len(utxos) == 0 {
		fmt.Println("No UTXO found")
		return nil
	}

	return utxos
}

func SelectUTXOs(utxos AddressUTXO, amount int64, sentAddr string) ([]string, []int, []int64) {
	selectedUtxos := make([]string, 0)
	selectedIndexes := make([]int, 0)
	selectedValues := make([]int64, 0)

	// sort the utxos by value descending order
	sort.Slice(utxos, func(i, j int) bool {
		return utxos[i].Value > utxos[j].Value
	})

	var totalAmount int64
	for _, utxo := range utxos {
		selectedUtxos = append(selectedUtxos, utxo.Txid)
		selectedIndexes = append(selectedIndexes, utxo.Vout)
		selectedValues = append(selectedValues, utxo.Value)
		totalAmount += utxo.Value
		if totalAmount >= amount {
			break
		}
	}

	if totalAmount < amount {
		log.Fatalf("Insufficient funds: needed %f but only found %f", amount, totalAmount)
	}

	return selectedUtxos, selectedIndexes, selectedValues
}

func GetFeeRate() int64 {
	url := "https://mempool.space/testnet/api/v1/fees/recommended"
	resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error getting fee rate:", err)
		return 0
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading fee rate response:", err)
		return 0
	}

	var feeRate FeeRate
	json.Unmarshal(body, &feeRate)
	return feeRate.FastestFee
}

func SpendMultiSig(wifStrs []string, redeemScript []byte, amount int64, sentAddr string, recvAddr string) ([]byte, string, error) {
	privKeys := make([]*PrivateKey, len(wifStrs))

	for i, wifStr := range wifStrs {
		wif, err := btcutil.DecodeWIF(wifStr)
		if err != nil {
			return nil, "", err
		}
		privKeys[i] = wif.PrivKey
	}

	redeemTx := wire.NewMsgTx(wire.TxVersion)

	// Create TxIn
	// Get unspent transaction output
	utxos := GetUnspentUtxos(sentAddr)
	if utxos == nil {
		return nil, "", fmt.Errorf("No UTXOs found")
	}

	// Select UTXOs
	VIRTUAL_SIZE := 280
	fee := GetFeeRate() * int64(VIRTUAL_SIZE)
	selectedUtxos, selectedIndexes, selectedValues := SelectUTXOs(utxos.(AddressUTXO), amount+fee, sentAddr)

	var totalValue int64
	for i, utxo := range selectedUtxos {
		utxoHash, err := chainhash.NewHashFromStr(utxo)
		if err != nil {
			return nil, "", err
		}
		//_, value := utils.ParseTransaction(utxo, sentAddr)
		outPoint := wire.NewOutPoint(utxoHash, uint32(selectedIndexes[i]))
		txIn := wire.NewTxIn(outPoint, nil, nil)
		redeemTx.AddTxIn(txIn)

		totalValue += selectedValues[i]

		fmt.Println("UTXO: ", utxo, "Index: ", uint32(selectedIndexes[i]), "Value: ", selectedValues[i])
	}

	// // you should provide your UTXO hash
	// utxoHash, err := chainhash.NewHashFromStr(utxo)
	// if err != nil {
	// 	return nil, "", nil
	// }

	// // Create TxIn
	// index, value := utils.ParseTransaction(utxo, sentAddr)
	// println("index", index)
	// outPoint := wire.NewOutPoint(utxoHash, uint32(index))
	// txIn := wire.NewTxIn(outPoint, nil, nil)
	// redeemTx.AddTxIn(txIn)

	// adding the output to tx
	decodedAddr, err := btcutil.DecodeAddress(recvAddr, &chaincfg.TestNet3Params)
	if err != nil {
		return nil, "", err
	}

	destinationAddrByte, err := txscript.PayToAddrScript(decodedAddr)
	if err != nil {
		return nil, "", err
	}

	// adding the destination address and the amount to the transaction
	redeemTxOut := wire.NewTxOut(amount, destinationAddrByte)
	redeemTx.AddTxOut(redeemTxOut)

	changeAddr := sentAddr
	decodedChangeAddr, err := btcutil.DecodeAddress(changeAddr, &chaincfg.TestNet3Params)
	if err != nil {
		return nil, "", err
	}

	myDestinationAddrByte, err := txscript.PayToAddrScript(decodedChangeAddr)
	if err != nil {
		return nil, "", err
	}

	// //-- OP_RETURN--
	// opReturnScript, err := txscript.NewScriptBuilder().AddOp(txscript.OP_RETURN).AddData([]byte(opReturnData)).Script()
	// if err != nil {
	// 	return nil, "", err
	// }
	// opReturnTxOut := wire.NewTxOut(0, opReturnScript)
	// redeemTx.AddTxOut(opReturnTxOut)

	myRedeemTxOut := wire.NewTxOut(totalValue-amount-fee, myDestinationAddrByte)
	redeemTx.AddTxOut(myRedeemTxOut)

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
	//fmt.Println("Signed Transaction: ", hexSignedTx)
	return signedTx.Bytes(), hexSignedTx, nil
}
