import logo from "../../public/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import { useGlobalState } from "@/context/GlobalStateContext";
import Web3 from "web3";

export default function Header() {
  const { typeMenu, setTypeMenu, address, setAddress, login, setLogin } =
    useGlobalState();

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
        setAddress(userAccount);
      } catch (error) {
        console.error(
          "User denied account access or an error occurred:",
          error
        );
      }
    } else {
      console.log(
        "Please install MetaMask or another Ethereum wallet provider."
      );
    }
  }

  async function handleLogout() {
    setLogin(false);
    setAddress("");
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User has disconnected their wallet
      console.log("User disconnected their wallet.");
      handleLogout();
    } else {
      const userAccount = accounts[0];
      console.log("Account changed:", userAccount);
      setAddress(userAccount);
    }
  }

  function handleDisconnect() {
    console.log("Disconnected from MetaMask.");
    handleLogout();
  }
  return (
    <header className="fixed flex justify-between w-full header">
      <a href="#" className="logo">
        <img src={logo.src} alt="logo" />
      </a>
      <div className="tab">
        <button className="button-type1 active">Exchange</button>
        <button className="button-type1">About</button>
      </div>
      <div className="menu">
        {login ? (
          <button className="button-type2" onClick={() => handleLogout()}>
            {address.slice(0, 6) + "..." + address.slice(-4)}
          </button>
        ) : (
          <button className="button-type2" onClick={() => handleLogin()}>
            Login
          </button>
        )}
        <button className="menu-hamburger">
          <FontAwesomeIcon icon={faBars} className="text-2xl" />
        </button>
      </div>
    </header>
  );
}
