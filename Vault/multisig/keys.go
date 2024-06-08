package multisig

import (
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcutil"
)


type PublicKey = btcec.PublicKey
type PrivateKey = btcec.PrivateKey
type WIF = btcutil.WIF

func NewPrivateKey() (*PrivateKey, error) {
	return btcec.NewPrivateKey()
}

func NewPublicKey(privKey *PrivateKey) *PublicKey {
	return privKey.PubKey()
}

func NewWIF(privKey *PrivateKey) (*WIF, error) {
	return btcutil.NewWIF(privKey, &chaincfg.TestNet3Params, true)
}
