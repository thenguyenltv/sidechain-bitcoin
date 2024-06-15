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

export default function card() {
  const imageSrc = "";
  const subImageSrc = "";
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
      alert("Exchange");
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
                <input type="number" placeholder="0" />
                <p className="rate">$0.00</p>
              </div>
            </div>
          </div>
        </div>

        <button
          className="button-type2 w-full "
          onClick = {handleExchangeClick}
        >
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
            <div className="info-text absolute bottom-full mb-2 text-xs bg-gray-800 text-white p-1 rounded opacity-0 transition-opacity duration-300">
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
          <div className="info-text absolute bottom-full mb-2 text-xs bg-gray-800 text-white p-1 rounded opacity-0 transition-opacity duration-300">
            Remove
          </div>
        </div>
      </div>
    </>
  );
}
