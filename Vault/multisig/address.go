package multisig

import (
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/btcutil"
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