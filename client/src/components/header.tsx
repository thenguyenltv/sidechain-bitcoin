import logo from "../../public/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import { useGlobalState } from "@/context/GlobalStateContext";
import Web3 from "web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import React from "react";
import { toast } from "react-toastify";

export default function Header() {
  const {
    typeMenu,
    setTypeMenu,
    login,
    setLogin,
    wallet1,
    setWallet1,
    wallet2,
    setWallet2,
    login2,
    setLogin2,
  } = useGlobalState();

  useEffect(() => {
    const buttonType1 = document.querySelectorAll(".button-type1");
    buttonType1.forEach((button) => {
      button.addEventListener("click", () => {
        buttonType1.forEach((button) => button.classList.remove("active"));
        button.classList.add("active");
        setTypeMenu(button.textContent?.toLowerCase());
      });
    });
  });

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("disconnect", handleDisconnect);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("disconnect", handleDisconnect);
      };
    }
  }, []);

  async function handleLogin() {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        const userAccount = accounts[0];
        console.log("Logged in with account:", userAccount);
        setLogin(true);
        setWallet1(userAccount);
        toast.success("Connected wallet successfully!");
      } catch (error) {
        console.error(
          "User denied account access or an error occurred:",
          error
        );
      }
    } else {
      toast.error("Please install MetaMask or another Ethereum wallet provider.");
      console.log(
        "Please install MetaMask or another Ethereum wallet provider."
      );
    }
  }

  // OKX Wallet: Settings --> Preferences --> Wallet connection --> Don't default to OKX Wallet
  async function handleLogin2() {
    if (okxwallet) {
      try {
        // Yêu cầu kết nối tài khoản
        // mainnet: const accounts = await okxwallet.bitcoin.requestAccounts();
        const accounts = await okxwallet.bitcoinTestnet.connect();
        const account = accounts.address;
        console.log("Logged in with account:", account);
        setLogin2(true);
        setWallet2(account);
        toast.success("Connected wallet successfully!");
      } catch (error) {
        console.error(
          "User denied account access or an error occurred:",
          error
        );
      }
    } else {
      toast.error("Please install OKX Wallet Extension or another Ethereum wallet provider.");
      console.log(
        "Please install OKX Wallet Extension or another Ethereum wallet provider."
      );
      // Hiển thị thông báo yêu cầu cài đặt ví
    }
  }

  async function handleLogout() {
    setLogin(false);
    setWallet1("");
  }

  async function handleLogout2() {
    setLogin2(false);
    setWallet2("");
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User has disconnected their wallet
      console.log("User disconnected their wallet.");
      handleLogout();
    } else {
      const userAccount = accounts[0];
      console.log("Account changed:", userAccount);
      setWallet1(userAccount);
    }
  }

  function handleDisconnect() {
    console.log("Disconnected from MetaMask.");
    handleLogout();
  }
  return (
    <header className="fixed flex justify-between w-full header">
      <div className="wrap-logo">
        <a href="#" className="logo">
          <img src={logo.src} alt="logo" />
        </a>
      </div>
      <div className="tab">
        <button className="button-type1 active">Exchange</button>
        <button className="button-type1">About</button>
      </div>
      <div className="menu">
        {login2 ? (
          <button className="button-type2" onClick={() => handleLogout2()}>
            {wallet2.slice(0, 4) + "..." + wallet2.slice(-4)}
          </button>
        ) : (
          <button className="button-type2" onClick={() => handleLogin2()}>
            Connect BTC
          </button>
        )}
        {login ? (
          <button className="button-type2" onClick={() => handleLogout()}>
            {wallet1.slice(0, 4) + "..." + wallet1.slice(-4)}
          </button>
        ) : (
          <button className="button-type2" onClick={() => handleLogin()}>
            Connect EVM
          </button>
        )}
        <button className="menu-hamburger">
          <FontAwesomeIcon icon={faBars} className="text-2xl" />
        </button>
      </div>
    </header>
  );
}
