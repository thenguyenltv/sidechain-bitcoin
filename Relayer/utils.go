package main

import (
	"bytes"
	"encoding/binary"
	"encoding/hex"
	"io"
	"log"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
)

func isTargetingSidechain(btcTx *wire.MsgTx) bool {
	for _, out := range btcTx.TxOut {
		_, addresses, _, err := txscript.ExtractPkScriptAddrs(out.PkScript, &chaincfg.TestNet3Params)
		if err != nil {
			log.Fatalf("Failed to extract addresses from transaction output: %v", err)
		}

		for _, addr := range addresses {
			if addr.EncodeAddress() == TARGET_ADDRESS {
				return true
			}
		}
	}
	return false
}

// Hàm chuyển đổi txIn thành chuỗi hex
//
//	type TxIn struct {
//	    PreviousOutPoint OutPoint
//	    SignatureScript  []byte
//	    Witness          TxWitness
//	    Sequence         uint32
//	}
// func txInToHex(txIns []*wire.TxIn) string {
// 	var hexValues []string
// 	for _, txIn := range txIns {
// 		hexValues = append(hexValues, fmt.Sprintf("%x", txIn.PreviousOutPoint)) // outpoint = hash + index

// 		// number of bytes in the signature script
// 		hexValues = append(hexValues, fmt.Sprintf("%x", len(txIn.SignatureScript)))

// 		hexValues = append(hexValues, fmt.Sprintf("%x", txIn.SignatureScript))

// 		hexValues = append(hexValues, fmt.Sprintf("%x", txIn.Sequence))
// 	}
// 	return strings.Join(hexValues, ",")
// }

func writeVarint(w io.Writer, n uint64) error {
	if n < 0xfd {
		return binary.Write(w, binary.LittleEndian, uint8(n))
	} else if n <= 0xffff {
		err := binary.Write(w, binary.LittleEndian, uint8(0xfd))
		if err != nil {
			return err
		}
		return binary.Write(w, binary.LittleEndian, uint16(n))
	} else if n <= 0xffffffff {
		err := binary.Write(w, binary.LittleEndian, uint8(0xfe))
		if err != nil {
			return err
		}
		return binary.Write(w, binary.LittleEndian, uint32(n))
	} else {
		err := binary.Write(w, binary.LittleEndian, uint8(0xff))
		if err != nil {
			return err
		}
		return binary.Write(w, binary.LittleEndian, n)
	}
}

// txInToHex takes a slice of *wire.TxIn and returns a hex string of the input vector.
func txInToHex(txIns []*wire.TxIn) string {
	var buffer bytes.Buffer
	// Write the number of inputs as a varint
	writeVarint(&buffer, uint64(len(txIns)))

	for _, txIn := range txIns {
		// Manually serialize the PreviousOutPoint
		hash := txIn.PreviousOutPoint.Hash[:]
		buffer.Write(hash)

		index := make([]byte, 4)
		binary.LittleEndian.PutUint32(index, txIn.PreviousOutPoint.Index)
		buffer.Write(index)

		// Serialize the SignatureScript length as a varint
		scriptLen := uint64(len(txIn.SignatureScript))
		writeVarint(&buffer, scriptLen)

		// Serialize the SignatureScript
		buffer.Write(txIn.SignatureScript)

		// Serialize the Sequence
		binary.Write(&buffer, binary.LittleEndian, txIn.Sequence)
	}

	// Convert the bytes to a hex string
	return hex.EncodeToString(buffer.Bytes())
}

// // Hàm chuyển đổi txOut thành chuỗi hex
// func txOutToHex(txOuts []*wire.TxOut) string {
// 	var hexValues []string
// 	for _, txOut := range txOuts {
// 		// Giả sử TxOut có một trường bạn muốn chuyển đổi, ví dụ: PkScript
// 		hexValues = append(hexValues, fmt.Sprintf("%x", txOut.PkScript))
// 	}
// 	return strings.Join(hexValues, ",")
// }

// txOutToHex chuyển đổi txOuts thành chuỗi hex.
func txOutToHex(txOuts []*wire.TxOut) string {
	var buffer bytes.Buffer
	// write the number of outputs as a varint
	writeVarint(&buffer, uint64(len(txOuts)))
	for _, txOut := range txOuts {
		// Serialize giá trị Value dưới dạng little-endian
		binary.Write(&buffer, binary.LittleEndian, txOut.Value)

		// Serialize độ dài của PkScript dưới dạng varint
		pkScriptLen := uint64(len(txOut.PkScript))
		writeVarint(&buffer, pkScriptLen)

		// Serialize PkScript
		buffer.Write(txOut.PkScript)
	}

	// Chuyển buffer thành chuỗi hex
	hexString := hex.EncodeToString(buffer.Bytes())

	return hexString
}

// Hàm chuyển Locktime thành chuỗi hex
func locktimeToHex(locktime uint32) string {
	lockTimeBytes := make([]byte, 4)
	binary.LittleEndian.PutUint32(lockTimeBytes, locktime)

	return hex.EncodeToString(lockTimeBytes)
}

// Hàm chuyển đổi Version thành chuỗi hex
func versionToHex(version int32) string {
	versionBytes := make([]byte, 4)
	binary.LittleEndian.PutUint32(versionBytes, uint32(version))

	return hex.EncodeToString(versionBytes)
}
