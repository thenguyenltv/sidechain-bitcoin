package multisig

import (
	"bytes"
	"encoding/hex"

	"go-multisig/utils"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/txscript"
)


func SpendMultiSig(wifStrs []string, redeemScript []byte, uxto string, sentAddr string, recvAddr string) ([]byte, string, error) {
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
	index := utils.ParseTransaction(uxto, sentAddr)
	outPoint := wire.NewOutPoint(utxoHash, uint32(index))

	txIn := wire.NewTxIn(outPoint, nil, nil)

	redeemTx.AddTxIn(txIn)

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