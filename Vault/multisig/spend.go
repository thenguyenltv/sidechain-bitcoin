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
	"time"

	//"go-multisig/utils"

	"go-multisig/utils"

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
		if utxo.Status.Confirmed == false {
			continue
		}

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

func CalculateFee(tx *wire.MsgTx, feeRateSatPerVbyte int64) (int64, error) {
    weight := tx.SerializeSizeStripped() // Get weight of the stripped transaction
    vsize := (weight + 3) / 4             // Calculate vsize (add 3 for witness discount) and round up
	fee := int64(vsize) * feeRateSatPerVbyte
    return fee, nil
}


// Function to combine signatures
func CombineSignatures(signatures []utils.PartialSignature, redeemScript []byte) ([]byte, error) {
    scriptBuilder := txscript.NewScriptBuilder()
    scriptBuilder.AddOp(txscript.OP_FALSE)
    for _, sig := range signatures {
        scriptBuilder.AddData(sig.Signature)
    }
    scriptBuilder.AddData(redeemScript)

    scriptSig, err := scriptBuilder.Script()
	if err != nil {
		return nil, err
	}
    return scriptSig, nil
}

func EncodeTxToHex(tx *wire.MsgTx) string {
    var buf bytes.Buffer
    err := tx.Serialize(&buf)
    if err != nil {
        // Handle the serialization error appropriately (e.g., log or return an error)
        log.Fatalf("Error serializing transaction: %v", err)
    }
    return hex.EncodeToString(buf.Bytes())
}

// Global variable to store partial signatures
var partialSignatures []utils.PartialSignature


func CreateRawTx(redeemScript []byte, amount int64, sentAddr string, recvAddr string) (string, error) {
	redeemTx := wire.NewMsgTx(wire.TxVersion)

	// Get unspent transaction output
	
	utxos := GetUnspentUtxos(sentAddr)
	if utxos == nil {
		return "", fmt.Errorf("No UTXOs found")
	}

	// Select UTXOs
	VIRTUAL_SIZE := 280
	fee := GetFeeRate() * int64(VIRTUAL_SIZE)
	fee = 13219
	selectedUtxos, selectedIndexes, selectedValues := SelectUTXOs(utxos.(AddressUTXO), amount + fee, sentAddr)

	// Create multiple txIns
	fmt.Println("\033[33m----SELECTED UTXOs----\033[0m")
	var totalValue int64
	for i, utxo := range selectedUtxos {
		utxoHash, err := chainhash.NewHashFromStr(utxo)
		if err != nil {
			return  "", err
		}

		//_, value := utils.ParseTransaction(utxo, sentAddr)
		outPoint := wire.NewOutPoint(utxoHash, uint32(selectedIndexes[i]))
		txIn := wire.NewTxIn(outPoint, nil, nil)
		redeemTx.AddTxIn(txIn)

		totalValue += selectedValues[i]

		fmt.Println("\033[34m  --> UTXO: ", utxo, "Index: ", uint32(selectedIndexes[i]), "Value: ", selectedValues[i], "\033[0m")
	}

	fmt.Println()

	// adding the destination address and the amount to the transaction
	decodedAddr, err := btcutil.DecodeAddress(recvAddr, &chaincfg.TestNet3Params)
	if err != nil {
		return "", err
	}
	destinationAddrByte, err := txscript.PayToAddrScript(decodedAddr)
	if err != nil {
		return "", err
	}
	redeemTxOut := wire.NewTxOut(amount, destinationAddrByte)
	redeemTx.AddTxOut(redeemTxOut)


	// adding the change address to the transaction
	changeAddr := sentAddr
	decodedChangeAddr, err := btcutil.DecodeAddress(changeAddr, &chaincfg.TestNet3Params)
	if err != nil {
		return "", err
	}
	myDestinationAddrByte, err := txscript.PayToAddrScript(decodedChangeAddr)
	if err != nil {
		return "", err
	}
	myRedeemTxOut := wire.NewTxOut(totalValue-amount-fee, myDestinationAddrByte)
	redeemTx.AddTxOut(myRedeemTxOut)


	// //-- OP_RETURN--
	// opReturnScript, err := txscript.NewScriptBuilder().AddOp(txscript.OP_RETURN).AddData([]byte(opReturnData)).Script()
	// if err != nil {
	// 	return nil, "", err
	// }
	// opReturnTxOut := wire.NewTxOut(0, opReturnScript)
	// redeemTx.AddTxOut(opReturnTxOut)


	// signing the tx
	fmt.Println("\033[33m----SIGNING TRANSACTION----\033[0m")
	for i := 0; i < len(redeemTx.TxIn); i++ {
		//send request to signers
		signerEndpoints := []string{"http://localhost:8081/sign", "http://localhost:8082/sign", "http://localhost:8083/sign", "http://localhost:8084/sign", "http://localhost:8086/sign", "http://localhost:8087/sign", "http://localhost:8088/sign"}
		txHash := EncodeTxToHex(redeemTx)

		fmt.Println("\033[35mSending sign requests to signers for input: ", i, "\033[0m")
		err := utils.SendSignRequests(signerEndpoints, i, txHash, redeemScript, &partialSignatures)
		if err != nil {
			return "", err
		}

		time.Sleep(5 * time.Second) 
		if len(partialSignatures) >= 5 {
			fmt.Println("\033[32mAll signatures received\033[0m")
		} else {
			fmt.Println("\033[31mNot all signatures received\033[0m")
			break
		}

		// sign the transaction
		scriptSig, err := CombineSignatures(partialSignatures[:5], redeemScript)
		if err != nil {
			return "", err
		}
		redeemTx.TxIn[i].SignatureScript = scriptSig
		
		//clear list of partial signatures
		partialSignatures = nil
		fmt.Println()
	}

	var signedTx bytes.Buffer
	redeemTx.Serialize(&signedTx)

	hexSignedTx := hex.EncodeToString(signedTx.Bytes())
	//fmt.Println("Signed Transaction: ", hexSignedTx)
	return hexSignedTx, nil
}


