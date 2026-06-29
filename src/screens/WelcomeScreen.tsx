import React from "react";

type Props = {
  active: boolean;
  onNext: () => void;
  time: string;
  batteryLevel: number;
};

export default function WelcomeScreen({ active, onNext, time, batteryLevel }: Props) {
  return (
    <section className={`screen ${active ? "active" : ""}`} id="welcome">
      <img className="bg" src="https://i.postimg.cc/kg6wmL76/ac47a1821562958e8931d9ea7fe451dc.jpg" alt="" />
      <div className="fade"></div><div className="grid-bg"></div>
      <header className="status">
        <span>{time}</span>
        <div className="icons">
          <span className="wifi"></span>
          <span className="battery"><i style={{ width: Math.max(8, batteryLevel) + "%" }}></i></span>
          <span>{batteryLevel}%</span>
        </div>
      </header>
      <section className="honey-page">
        <div className="logo-cn"><b>云蜜计划</b><small>MINMIN SWEET CLOUD</small></div>
        <div className="top-note">New special effects</div>
        <div className="big-heart">
          <img src="https://i.postimg.cc/nrbp34RQ/011e2f9cdee58c5bbb8da86ccf374663.jpg" alt="" />
          <div className="circle-ring"></div>
        </div>
        <svg className="draw-svg" viewBox="0 0 390 430">
          <path className="draw-line" d="M24 172 C94 70 179 98 204 174 C225 106 316 76 368 161" stroke="rgba(255,255,255,.92)" strokeWidth="2.2" fill="none"></path>
          <path className="draw-line" d="M-30 300 C52 244 126 312 205 260 C268 218 302 151 410 180" stroke="rgba(238,124,164,.58)" strokeWidth="2" fill="none" style={{ animationDelay: ".35s" }}></path>
        </svg>
        <div className="honey-script">Honey<span>DEAREST</span></div>
        <div className="cn-title">甘脆童话<small>SWEET CLOUD STORY</small></div>
        <div className="right-mini">安置我<br /><small>sweet archive</small></div>
        <div className="hline"></div>
        <div className="cloud-title">Project Neutral Cloud</div>
        <div className="barcode"></div>
        <section className="card">
          <p className="label">Capuchino Bunny MinMin</p>
          <h1>Honey Dearest<br />Sweet Story Lab</h1>
          <p>Viết nên những câu chuyện dịu ngọt, lưu giữ nhân vật yêu thích và mở một thế giới nhỏ của riêng bạn.</p>
          <button className="primary" onClick={onNext}>
            <span>Bắt đầu</span>
            <svg viewBox="0 0 24 24"><path d="M8 5l8 7-8 7"></path></svg>
          </button>
        </section>
      </section>
    </section>
  );
}
