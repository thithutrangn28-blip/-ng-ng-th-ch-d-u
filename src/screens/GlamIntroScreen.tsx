import React from "react";

type Props = {
  active: boolean;
  onNext: () => void;
  onBack: () => void;
};

export default function GlamIntroScreen({ active, onNext, onBack }: Props) {
  return (
    <section className={`screen glam ${active ? "active" : ""}`} id="glamIntro">
      <div className="diagonal"><i className="dia2"></i><i className="dia3"></i></div>
      <div className="big-back-text">THE<br /><span>GLAMOUR</span><br />STYLE</div>
      <div className="glam-logo"><b>YERENICA</b><small>LEBOVNY</small></div>
      <i className="sparkle sp1"></i><i className="sparkle sp2"></i><i className="sparkle sp3"></i><i className="sparkle sp4"></i>
      <button className="back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"></path></svg>
      </button>
      <section className="left-panel">
        <img src="https://i.postimg.cc/SRHqtwSp/011e2f9cdee58c5bbb8da86ccf374663-(1).png" alt="" />
      </section>
      <section className="right-strips">
        <div className="strip"><img src="https://i.postimg.cc/SRHqtwSp/011e2f9cdee58c5bbb8da86ccf374663-(1).png" alt="" /></div>
        <div className="strip"><img src="https://i.postimg.cc/SRHqtwSp/011e2f9cdee58c5bbb8da86ccf374663-(1).png" alt="" /></div>
        <div className="strip"><img src="https://i.postimg.cc/SRHqtwSp/011e2f9cdee58c5bbb8da86ccf374663-(1).png" alt="" /></div>
        <div className="strip"><img src="https://i.postimg.cc/SRHqtwSp/011e2f9cdee58c5bbb8da86ccf374663-(1).png" alt="" /></div>
      </section>
      <p className="quote"><b>Strong, intelligent, charming, successful.</b><br />Sweet little season, soft promise, precious archive.</p>
      <section className="glam-bottom">
        <h2><span className="pink">Precious</span> Story<br />Dream Archive</h2>
        <p>Open a tiny pink studio for characters, memories, notes, roleplay and soft imagination.</p>
        <button className="primary" onClick={onNext}>
          <span>Đi vào bên trong</span>
          <svg viewBox="0 0 24 24"><path d="M8 5l8 7-8 7"></path></svg>
        </button>
      </section>
    </section>
  );
}
