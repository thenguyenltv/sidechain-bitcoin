package main

import (
	"flag"
	"go-multisig/multisig"
	"go-multisig/utils"
	"strings"

	"fmt"
	"os"
)

var vaultAddr = "2MvLZyMwcAju7snmtEHHUqVmzK2GmMwKzs1"


func help() {
    addressCmd := flag.NewFlagSet("address", flag.ExitOnError)
    addressM := addressCmd.Int("m", 0, "Minimum keys for spending (required)")
	addressN := addressCmd.Int("n", 0, "Total number of keys (required)")

    fundCmd := flag.NewFlagSet("fund", flag.ExitOnError)
    fundWif := fundCmd.String("wif", "", "Comma-separated list of WIFs (required)")
    fundM := fundCmd.Int("m", 0, "Minimum keys for spending (required)")
	fundAmount := fundCmd.Int64("amount", 0, "Amount to spend (required)")
	fundSentAddr := fundCmd.String("sent", "", "Sending address (required)")
    fundRecvAddr := fundCmd.String("recv", "", "Receiving address (required)")

    // Usage Function
    flag.Usage = func() {
        fmt.Println("Usage: go-multisig [subcommand] [options]")
        fmt.Println("Subcommands:")
        fmt.Println("  address\tGenerate a multisig address")
        fmt.Println("  fund\t\tFund a multisig address")
        fmt.Println("Options:")
        flag.PrintDefaults()
    }

	if len(os.Args) < 2 {
		flag.Usage()
		return
	}

	switch os.Args[1] {
	case "address":
		addressCmd.Parse(os.Args[2:])
		if *addressM == 0 || *addressN == 0 {
			addressCmd.PrintDefaults()
			return
		}
		
		_, pubKeys, wifs := multisig.CreateKeys(*addressN)
		// convert wifs to string
		wifStrs := make([]string, len(wifs))
		for i, wif := range wifs {
			wifStrs[i] = wif.String()
		}
		redeemScript, addr, err := multisig.BuildMultiSigP2SHAddr(pubKeys, *addressM)
		if err != nil {
			fmt.Println("Error building multisig address:", err)
			return
		}
		utils.WriteNeededMultisigInfo(addr, redeemScript)
		utils.WriteFile(addr, *addressM, *addressN, wifStrs)
		fmt.Println("Multisig Address:", addr)
		fmt.Println("WIFs:", wifStrs)

	case "fund":
		fundCmd.Parse(os.Args[2:])
		if *fundM == 0 || *fundAmount == 0 || *fundWif == "" || *fundSentAddr == "" || *fundRecvAddr == ""  {
			fundCmd.PrintDefaults()
			return
		}
		// Convert WIFs to a slice of strings
		wifStrs := strings.Split(*fundWif, ",")
		multisig.Fund(wifStrs, *fundM, *fundAmount, *fundSentAddr, *fundRecvAddr)

	default:
		flag.Usage()
	}
}



func main() {
	help()
}

