package multisig

import (
	"fmt"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
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

	// disasm, err := txscript.DisasmString(redeemScript)

	// if err != nil {
	// 	fmt.Println("error disassembling redeem script")
	// }

	// fmt.Println("Redeem Script string: ", disasm)

	fmt.Println("Redeem Script byte:", redeemScript)
	// assem, err := assembleScript("OP_HASH160 OP_PUSHBYTES_20 0x21eb2398b15b72b1b863d22c6c5fb9c75e94e927 OP_EQUAL")
	// if err != nil {
	// 	fmt.Println("error assembling redeem script: ", err)
	// }
	// fmt.Println("Redeem Script byte convert:", assem)

	//fmt.Println("Redeem Script byte convert:", txscript.Assemble(disasm))
	return redeemScript, addr.EncodeAddress(), nil

}

