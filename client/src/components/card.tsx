import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faArrowLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import info from "@/data/info";
import coins from "@/data/coin";

import Web3 from "web3";

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
  const {
    wallet1,
    setWallet1,
    wallet2,
    setWallet2,
    to,
    setTo,
    from,
    setFrom,
    typeMenu,
    address,
    setAddress,
    login,
    setLogin,
  } = useGlobalState();
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
    if (address) {
      if (from.currency && to.currency && amount > 0) {
        setOpen(true);
      }
    } else {
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
          {address ? "Exchange" : "Connect wallet"}
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
                        Fee
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        -0.0001 BTC
                      </p>
                    </div>
                    <div className="lock flex justify-between pb-8 border-b">
                      <p className="text-sm font-semibold leading-6 text-gray-600">
                        Lock period
                      </p>
                      <p className="text-base	 font-semibold leading-6 text-gray-900">
                        9 months
                      </p>
                    </div>
                  </div>
                  <div className="notify bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <p className="text-xs font-semibold leading-6 text-red-600 mb-4">
                      Sent over {amount} BTC to your wallet to above address.
                    </p>
                    <p className="text-xs leading-6 text-gray-900">
                      Your Deposit and HODL Score will be linked to{" "}
                      {address.slice(0, 6) + "..." + address.slice(-4)}.
                    </p>
                    <p className="text-xs leading-6 text-gray-900">
                      This address will be able to withdraw funds and extend
                      lock duration.
                    </p>
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
