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
```bash
.\go-multisig fund -amount <amount> -m <minimum number of public keys> -sent <sender address> -recv <receiver address> -wif <WIF strings, seprate by comma `,`, at least m WIF strings>
```

Example:
```bash
.\go-multisig.exe fund -amount 12000 -m 5 -sent 2MvLZyMwcAju7snmtEHHUqVmzK2GmMwKzs1 -recv mkn4Txu4v9efkbVehjK4hydJhBBpbv6HuA -wif cQGcfGErsc2QwuKvh2djWNjav2SCJ9ZWGVPcedn2MuNC5wPUpMt6,cNd297VsS2w6hLRVwbbMf4g1S5fnWq7budbCizkHLA9EhRVPp47P,cND7dhj34wP9qoDEcgB57sok9PnXNhLdarufKaKL1MezKrRxYYHf,cVUPpmQnD3UrpSmnTZDU6KE3khVbChdYF7GNdzpeowJtQcEAaT7a,cQ8cNzmJyXMQcA7ZkSScTDSpTp93YWtAnz8Gg7iefRnfBsVV6E1t
```
