import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";

export default function card() {
  const imageSrc = "";
  const subImageSrc = "";
  return (
    <div className="widget-wrap card flex flex-col">
      <div className="header flex justify-between w-full">
        <h2>Exchange</h2>
        <button className="setting-icon">
          <FontAwesomeIcon icon={faGear} />
        </button>
      </div>

      <div className="body flex flex-col w-full">
        <div className="box from">
          <p>From</p>
          <div className="info flex">
            <div className="info__image">
              {imageSrc && <img src={imageSrc} alt="" />}

              <div className="info__image__sub">
                {subImageSrc && <img src={subImageSrc} alt="" />}
              </div>
            </div>
            <div className="info__text">
              <p>Select chain and token</p>
            </div>
          </div>
        </div>

        <div className="box to">
          <p>To</p>
          <div className="info flex">
            <div className="info__image">
              {imageSrc && <img src={imageSrc} alt="" />}

              <div className="info__image__sub">
                {subImageSrc && <img src={subImageSrc} alt="" />}
              </div>
            </div>
            <div className="info__text">
              <p>Select chain and token</p>
            </div>
          </div>
        </div>

        <div className="box payment">
          <p>You pay</p>
          <div className="info flex">
            <div className="info__image">
              {imageSrc && <img src={imageSrc} alt="" />}

              <div className="info__image__sub">
                {subImageSrc && <img src={subImageSrc} alt="" />}
              </div>
            </div>
            <div className="info__text">
              <p>0</p>
              <p className="rate">$0.00</p>
            </div>
          </div>
        </div>
      </div>

      <button className="button-type2 w-full ">Connect wallet</button>
    </div>
  );
}
