import { createContext, useContext, useState } from "react";

const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
  const [wallet1, setWallet1] = useState("");
  const [wallet2, setWallet2] = useState("");
  const [to, setTo] = useState({
    currency: "",
    image: "",
  });
  const [from, setFrom] = useState({
    currency: "",
    image: "",
  });
  const [typeMenu, setTypeMenu] = useState("exchange");
  const [address, setAddress] = useState("");
  const [login, setLogin] = useState(false);
  const [login2, setLogin2] = useState(false);


  return (
    <GlobalStateContext.Provider
      value={{
        wallet1,
        setWallet1,
        wallet2,
        setWallet2,
        to,
        setTo,
        from,
        setFrom,
        typeMenu,
        setTypeMenu,
        address,
        setAddress,
        login,
        setLogin,
        login2,
        setLogin2,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  return useContext(GlobalStateContext);
};
