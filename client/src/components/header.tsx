import logo from "../../public/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export default function Header() {
  return (
    <header className="fixed flex justify-between w-full	header">
      <a href="#" className="logo">
        <img src={logo.src} alt="logo" />
      </a>
      <div className="tab">
        <button className="button-type1 active"> Exchange</button>
        <button className="button-type1">Gas</button>
      </div>
      <div className="menu">
        <button className="button-type2">Connect</button>
        <button className="menu-hamburger">
          <FontAwesomeIcon icon={faBars} className="text-2xl" />
        </button>
      </div>
    </header>
  );
}
