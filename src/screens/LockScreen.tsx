import React, { useState, useEffect, useRef } from "react";
import { getLockWallpaper, setLockWallpaper } from "../lib/storage";
import { motion, AnimatePresence } from "motion/react";

type Props = {
  active: boolean;
  onNext: () => void;
  onBack: () => void;
  time: string;
  date: string;
  batteryLevel: number;
};

export default function LockScreen({ active, onNext, onBack, time, date, batteryLevel }: Props) {
  const [wallpaper, setWallpaper] = useState<string>("https://i.postimg.cc/nrbp34RQ/011e2f9cdee58c5bbb8da86ccf374663.jpg");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("Chọn hình nền hoặc nhập mật khẩu để mở khóa.");
  const [shake, setShake] = useState(false);
  const secret = "9093";
  const passContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = getLockWallpaper();
    if (saved) setWallpaper(saved);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = r.result as string;
      setWallpaper(res);
      setLockWallpaper(res);
      setMsg("Hình nền đã lưu trong trình duyệt rồi nha.");
    };
    r.readAsDataURL(f);
  };

  const handleKey = (key: string) => {
    if (key === "clear") {
      setPass("");
      setMsg("Đã xóa mã.");
      return;
    }
    if (key === "back") {
      setPass((p) => p.slice(0, -1));
      return;
    }
    if (pass.length >= 4) return;
    
    const newPass = pass + key;
    setPass(newPass);
    
    if (newPass.length === 4) {
      if (newPass === secret) {
        setMsg("Đã mở khóa.");
        setTimeout(() => {
          onNext();
        }, 260);
        setTimeout(() => {
          setPass("");
          setMsg("Chọn hình nền hoặc nhập mật khẩu để mở khóa.");
        }, 680);
      } else {
        setMsg("Mật khẩu chưa đúng, thử lại nha.");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setTimeout(() => setPass(""), 520);
      }
    }
  };

  return (
    <section className={`screen ${active ? "active" : ""}`} id="lock">
      <img className="bg" src={wallpaper} alt="" />
      <div className="fade"></div>
      <button className="back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"></path></svg>
      </button>
      <section className="lock-page">
        <header className="lock-head">
          <div>
            <span className="lock-label">Sweet lock</span>
            <h2>{time}</h2>
            <p>{date}</p>
          </div>
          <div className="bat-card">
            <span className="bat-pink"><i style={{ width: Math.max(8, batteryLevel) + "%" }}></i></span>
            <b>{batteryLevel}%</b>
          </div>
        </header>
        <section className="music">
          <img src="https://i.postimg.cc/sXGdtTvw/87e599c75ca5ff69e209bba965dfce7a.jpg" alt="" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <span>Now playing</span>
            <b>Honey Cloud Letter</b>
            <small>MinMin Soft Radio</small>
            <div className="controls">
              <button><svg viewBox="0 0 24 24"><path d="M10 7v10l-7-5zM21 7v10l-7-5z"></path></svg></button>
              <button className="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></button>
              <button><svg viewBox="0 0 24 24"><path d="M3 7v10l7-5zM14 7v10l7-5z"></path></svg></button>
              <div className="eq"><i></i><i></i><i></i><i></i></div>
            </div>
          </div>
        </section>
        
        <motion.section 
          className="pass" 
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.3 }}
          ref={passContainerRef}
        >
          <div className="pass-top">
            <div>
              <span className="lock-label">Mật khẩu màn hình khóa</span>
              <h3>Nhập mật khẩu</h3>
            </div>
            <label className="picker">
              <input type="file" accept="image/*" onChange={handleFile} />
              <svg viewBox="0 0 48 48">
                <rect x="8" y="10" width="32" height="26" rx="7"></rect>
                <path d="M14 31l8-9 7 7 4-5 5 7"></path>
                <circle cx="31" cy="18" r="3"></circle>
              </svg>
            </label>
          </div>
          <div className="dots">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i < pass.length ? "filled" : ""}></i>
            ))}
          </div>
          <p className="msg">{msg}</p>
          <div className="keys">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => handleKey(n.toString())}>{n}</button>
            ))}
            <button onClick={() => handleKey("clear")}>C</button>
            <button onClick={() => handleKey("0")}>0</button>
            <button onClick={() => handleKey("back")}>⌫</button>
          </div>
        </motion.section>
      </section>
    </section>
  );
}
