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


// create private keys, public keys, wifs
func CreateKeys(n int) ([]*PrivateKey, []*PublicKey, []*WIF) {
	privKeys := make([]*PrivateKey, n)
	for i := 0; i < n; i++ {
		privKey, err := NewPrivateKey()

		if err != nil {
			panic(err)
		}
		privKeys[i] = privKey
	}

	pubKeys := make([]*PublicKey, n)
	for i := 0; i < n; i++ {
		pubKeys[i] = NewPublicKey(privKeys[i])
	}

	wifs := make([]*WIF, n)
	for i := 0; i < n; i++ {
		wif, err := NewWIF(privKeys[i])
		if err != nil {
			panic(err)
		}
		wifs[i] = wif
	}
	return privKeys, pubKeys, wifs
}