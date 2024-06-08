# go-multisig
## Installation
```bash
go mod init go-multisig
go mod tidy
go build
```
Now you can run the binary file `go-multisig` in the current directory.

## Usage
### Create a new wallet
```bash
.\go-multisig address -m <minimum number of public keys> -n <total number of public keys>
```
Example:
```bash
.\go-multisig address -m 2 -n 3
```

### Create a new transaction
<!-- ```bash
./go-multisig transaction -w <wallet file> -t <transaction file> -a <amount> -r <receiver address>
``` -->
```bash
.\go-multisig fund -amount <amount> -m <minimum number of public keys> -recv <receiver address> -utxo <utxo string> -wif <all WIF strings, seprate by comma `,`>
```

Example:
```bash
.\go-multisig fund -amount 10 -m 4 -recv 2NEK1JNgomGtJ8THkPreWuuHZgSdGJBLFBX -utxo 9d90a4cf1dc746396c4150388717ae7d265be955e698246dadf74a28fd875ff5 -wif cV5jcDN7HRAePEW2XBivbdCdkfEhmvtpUPMSGGV5sE6jqkDnMZ8c,cNSH32FFmmTe1uBgFsPCc3CiUupNCpinGRMLLT3UrrQp1r4Kyosm,cNv9xyn2k6CCeyL3p6pkYxsiTpVEZzEEssE93uucLGvxcTNabuvM,cV3EqfMNfc3DLcb8jdXdfbYiNxXHPQAJDjM7mpXHpzsz18yxFDhJ,cQDNiqc4cxd9DKjtNj3C4qgct1X5xxNjM3QcCEnBjabPWWzPD1bM,cSGpBbmP6mFiFjxDUeviL7oeHkzp3LMWGzRDFQURcQZnys8S22xj,cTF2WJmiKFmu1M5qs29WtBsR1FDd6oRBKH4Raw4PHSxXZ2ZDB7PE
```
