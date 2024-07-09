package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Connect to Bitcoin Core
	btcClient := connectToBitcoinCore()
	// defer btcClient.Shutdown()

	// Start block polling
	go startBlockNotificationServer(btcClient)

	// Set up RESTful API
	setupHandlers(btcClient)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	fmt.Println("Press CTRL+C to stop")
	<-stop

	fmt.Println("Exiting...")
	time.Sleep(1 * time.Second)
}
