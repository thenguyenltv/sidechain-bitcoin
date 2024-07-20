import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faArrowLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import info from "@/data/info";
import coins from "@/data/coin";
import React from "react";
import { toast } from "react-toastify";

import Web3 from "web3";
import erc20Abi from "@/data/erc20Abi";

import { useGlobalState } from "@/context/GlobalStateContext";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function card() {
  const imageSrc = "";
  const subImageSrc = "";
  const [amount, setAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [infoReceive, setInfoReceive] = useState({});
  const [openBurn, setOpenBurn] = useState(false);
  const [burn, setBurn] = useState(BigInt(0));
  const [balance, setBalance] = useState(BigInt(0));
  const {
    vault,
    wallet1,
    setWallet1,
    wallet2,
    setWallet2,
    to,
    setTo,
    from,
    setFrom,
    typeMenu,
    login,
    setLogin,
  } = useGlobalState();

  const tokenAddress = "0xdDB9E7B01182886cE03f2d1Af16a7b7989Cf42aE";

  function fromClick() {
    const coin = document.querySelector(".coin");
    coin?.classList.remove("hidden");
    coin?.setAttribute("style", "top: -342px;");
  }

  function toClick() {
    const coin = document.querySelector(".coin");
    coin?.classList.remove("hidden");
    coin?.setAttribute("style", "top: -222px;");
  }

  function coinTypeClick(event, coin) {
    const coinElement = event.currentTarget.closest(".coin");
    const topValue = coinElement ? coinElement.style.top : null;

    const coinInfo = {
      image: coin.image.src,
      currency: coin.name,
    };

    if (topValue === "-342px") {
      setFrom(coinInfo);
    } else if (topValue === "-222px") {
      setTo(coinInfo);
    }

    coinElement.classList.add("hidden");
    event.currentTarget.classList.add("disabled");
  }

  function closeTypeClick(event) {
    const coinElement = event.currentTarget.closest(".coin");
    const topValue = coinElement ? coinElement.style.top : null;
    coinElement.classList.add("hidden");

    const coinInfo = {
      image: "",
      currency: "",
    };

    if (topValue === "-342px") {
      if (from.currency) {
        const target = document.getElementById(from.currency);
        target?.classList.remove("disabled");
        setFrom(coinInfo);
      }
    } else if (topValue === "-222px") {
      if (to.currency) {
        const target = document.getElementById(to.currency);
        target?.classList.remove("disabled");
        setTo(coinInfo);
      }
    }
  }

  async function handleExchangeClick() {
    if (wallet1) {
      if (from.currency && to.currency && amount > 0) {
        handleExchange();
      } else {
        toast.error("Please fill out all fields!");
      }
    } else {
      if (window.ethereum.isMetaMask) {
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
          toast.error('User denied account access or an error occurred:');
          console.error(
            "User denied account access or an error occurred:",
            error
          );
        }
      }
    }
  }

  const handleAmountChange = (event) => {
    const value = event.target.value;

    if (value === "" || Number(value) === 0) {
      setAmount(0);
    } else {
      setAmount(Number(value));
    }
  };

  async function handleExchange() {
    // gọi api đến okx bitcoin testnet wallet
    // gửi số tiền amount từ wallet2 đến wallet1
    // thêm op_return với dữ liệu là wallet1

    // Note: Use bitcoin mainnet --> comment to testnet
    if (from.currency === "Bitcoin") {
      // This API is not available in the testnet version
      // const result = await window.okxwallet.bitcoin.send({
      //   from: wallet2,
      //   to: vault,
      //   value: amount,
      //   memo: wallet1,
      //   memoPos: 0,
      // });
      // console.log("Transaction hash:", result);

      // infura_id : dec608097e254baeaa74abcc2356c604
      setOpen(true);
      var provider = new Web3.providers.WebsocketProvider(
        "wss://sepolia.infura.io/ws/v3/dec608097e254baeaa74abcc2356c604"
      );
      var web3_infura = new Web3(provider);
      var tokenContract = new web3_infura.eth.Contract(erc20Abi, tokenAddress);
      console.log("Token contract:", tokenContract);

      const handleBalance = async () => {
        const balance = await tokenContract.methods.balanceOf(wallet1).call();
        const formattedBalance = web3_infura.utils.fromWei(balance, "ether");
        console.log("Balance of address", wallet1, "is", formattedBalance);
        setBalance(formattedBalance);
      };

      handleBalance();

      const subscribeToTransfer = async () => {
        // tokenContract;
        console.log("Subscribing to Transfer event to...", wallet1);
        tokenContract.events
          .Transfer({
            filter: { to: wallet1 },
            fromBlock: "latest",
          })
          .on("data", (event) => {
            console.log("To:", event.returnValues.to);
            console.log("Address connected:", wallet1);
            console.log("Transfer event detected:", event);
            handleInfoReceive(
              event.returnValues.value,
              event.returnValues.from
            );
            handleBalance();
            setOpen(false);
            setOpenBurn(false);
            setOpenReceive(true);
          });
      };
      subscribeToTransfer();
    } else {
      const web3 = new Web3(window.ethereum);
      const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);
      const burnTokens = async (amount, btcRecv) => {
        try {
          const amountInWei = web3.utils.toWei(amount.toString(), "ether");
          
          console.log("Wallet1:", wallet1);
          const transaction = await tokenContract.methods
            .withdraw(btcRecv, amountInWei)
            .send({ from: wallet1 });

          console.log("Tokens burned:", amount);
          console.log("BTC received:", btcRecv);
          console.log("Transaction hash:", transaction);
          setBurn(amount);
          setOpen(false);
          setOpenReceive(false);
          setOpenBurn(true);
        } catch (error) {
          console.error("Error occurred:", error);
        }
      };

      burnTokens(amount, wallet2);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(wallet1);
    toast.success("Copied to clipboard!");
  }

  function handleInfoReceive(amount, address) {
    setInfoReceive({
      amount: amount,
      address: address,
    });
  }

  return (
    <>
      <div
        className={`widget-wrap exchange card flex flex-col ${
          typeMenu !== "exchange" ? "hidden" : ""
        }`}
      >
        <div className="header flex justify-between w-full">
          <h2>Exchange</h2>
          <button className="setting-icon">
            {/* <FontAwesomeIcon icon={faArrowLeft} style={{ color: "#ffffff" }} /> */}
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>

        <div className="body flex flex-col w-full">
          <div className="box from" onClick={fromClick}>
            <p>From</p>
            <div className="info flex">
              <div className="info__image">
                {from.image && <img src={from.image} alt="" />}

                <div className="info__image__sub">
                  {from.image && <img src={from.image} alt="" />}
                </div>
              </div>
              <div className="info__text">
                <p>{from.currency || "Select chain and token"}</p>
              </div>
            </div>
          </div>

          <div className="box to" onClick={toClick}>
            <p>To</p>
            <div className="info flex">
              <div className="info__image">
                {to.image && <img src={to.image} alt="" />}

                <div className="info__image__sub">
                  {to.image && <img src={to.image} alt="" />}
                </div>
              </div>
              <div className="info__text">
                <p>{to.currency || "Select chain and token"}</p>
              </div>
            </div>
          </div>

          <div className="box payment">
            <p>You pay</p>
            <div className="info flex">
              <div className="info__image">
                {from.image && <img src={from.image} alt="" />}

                <div className="info__image__sub">
                  {from.image && <img src={from.image} alt="" />}
                </div>
              </div>
              <div className="info__text">
                <input
                  type="number"
                  placeholder="0"
                  onChange={handleAmountChange}
                />
                <p className="rate">${(amount * 70000).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <button className="button-type2 w-full " onClick={handleExchangeClick}>
          {wallet1 ? "Exchange" : "Connect wallet"}
        </button>
      </div>

      <div
        className={`widget-wrap about card flex flex-col ${
          typeMenu !== "about" ? "hidden" : ""
        }`}
      >
        <div className="header flex justify-between w-full">
          <h2>About</h2>
          <button className="setting-icon">
            {/* <FontAwesomeIcon icon={faArrowLeft} style={{ color: "#ffffff" }} /> */}
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>

        <div className="body flex flex-col w-full">
          {info.map((item) => (
            <div key={item.id} className="box">
              <div className="info flex">
                <div className="info__image">
                  {imageSrc && <img src={imageSrc} alt="" />}
                </div>
                <div className="info__text">
                  <p>{`Name: ${item.name}`}</p>
                  <p>{`MSSV: ${item.mssv}`}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="coin flex hidden">
        {coins.map((coin, index) => (
          <div key={index} className="currency-unit relative">
            <div
              className="coin__image"
              aria-describedby={coin.name}
              id={coin.name}
              onClick={(event) => coinTypeClick(event, coin)}
            >
              {coin.image && <img src={coin.image.src} alt={coin.name} />}
            </div>
            <div className="info-text absolute bottom-full mb-2 text-xs bg-gray-800 text-white p-1 rounded-2xl opacity-0 transition-opacity duration-300">
              {coin.name}
            </div>
          </div>
        ))}
        <div className="currency-unit relative">
          <div
            className="coin__image"
            onClick={(event) => closeTypeClick(event)}
          >
            <FontAwesomeIcon icon={faXmark} />
          </div>
          <div className="info-text absolute bottom-full mb-2 text-xs bg-gray-800 text-white p-1 rounded-2xl opacity-0 transition-opacity duration-300">
            Remove
          </div>
        </div>
      </div>

      <Transition show={open}>
        <Dialog className="relative z-50" onClose={setOpen}>
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <TransitionChild
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg modal-deposit">
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start justify-center">
                      <div className="mt-3 text-center sm:mt-0">
                        <DialogTitle
                          as="h3"
                          className="text-xl font-bold leading-6 text-gray-900 text-center"
                        >
                          Send deposit
                        </DialogTitle>
                      </div>
                    </div>
                  </div>
                  <div className="info bg-white px-4 pb-4 pt-8 sm:p-6 sm:pb-4">
                    <div className="amount flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600 ">
                        Amount
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {amount} BTC
                      </p>
                    </div>
                    <div className="fee flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        Service fee
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        -0.0001 BTC
                      </p>
                    </div>
                    <div className="lock flex justify-between pb-8 border-b">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        Time to process
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        Up to 1 hour
                      </p>
                    </div>
                  </div>
                  <div className="notify bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <p className="text-sm font-semibold leading-6 text-gray-900 mb-4">
                      Sidechain's vault address
                    </p>
                    <div className="info-main-wallet flex justify-between	justify-items-center	items-center mb-4">
                      <p className="text-xl leading-6 text-gray-900">
                        {vault.slice(0, 10) + "..." + vault.slice(-10)}
                      </p>
                      <button
                        className="text-xs leading-6 text-gray-900 button-type2"
                        onClick={handleCopy}
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs font-semibold leading-6 text-red-600 mb-4">
                      Send {amount} BTC to the address above.<br />
                      Ensure your EVM address is included in the op_return:<br />
                      {wallet1}
                    </p>


                    <p className="text-xs leading-6 text-gray-900">
                    Do not send less than the amount or your deposit will be rejected
                    </p>
                    <p className="text-xs leading-6 text-gray-900">
                      If your transaction is not confirmed, please <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'blue' }}>contact</a> us.
                    </p>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition show={openReceive}>
        <Dialog className="relative z-50" onClose={setOpenReceive}>
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <TransitionChild
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg modal-deposit">
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start justify-center">
                      <div className="mt-3 text-center sm:mt-0">
                        <DialogTitle
                          as="h3"
                          className="text-xl font-bold leading-6 text-gray-900 text-center"
                        >
                          Received money successfully
                        </DialogTitle>
                      </div>
                    </div>
                  </div>
                  <div className="info bg-white px-4 pb-4 pt-8 sm:p-6 sm:pb-4">
                    <div className="amount flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600 ">
                        Amount
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {infoReceive.amount} BTC
                      </p>
                    </div>
                    <div className="fee flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        From
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {infoReceive.address?.slice(0, 10) +
                          "..." +
                          infoReceive.address?.slice(-6)}
                      </p>
                    </div>
                    <div className="lock flex justify-between pb-8 ">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        New balance
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {balance} pBTC
                      </p>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition show={openBurn}>
        <Dialog className="relative z-50" onClose={setOpenBurn}>
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <TransitionChild
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg modal-deposit">
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start justify-center">
                      <div className="mt-3 text-center sm:mt-0">
                        <DialogTitle
                          as="h3"
                          className="text-xl font-bold leading-6 text-gray-900 text-center"
                        >
                          Burn successfully
                        </DialogTitle>
                      </div>
                    </div>
                  </div>
                  <div className="info bg-white px-4 pb-4 pt-8 sm:p-6 sm:pb-4">
                    <div className="amount flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600 ">
                        From
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {wallet1?.slice(0, 10) + "..." + wallet1?.slice(-6)}
                      </p>
                    </div>
                    <div className="amount flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600 ">
                        Amount
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {burn} BTC
                      </p>
                    </div>
                    <div className="fee flex justify-between mb-3">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        To
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        {wallet2?.slice(0, 10) + "..." + wallet2?.slice(-6)}
                      </p>
                    </div>
                    <div className="lock flex justify-between pb-8 ">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        Estimated completion time
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        1 Day
                      </p>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
