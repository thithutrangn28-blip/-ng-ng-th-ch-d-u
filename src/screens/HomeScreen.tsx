import React, { useState, useEffect } from "react";
import { getHomeWallpaper, setHomeWallpaper } from "../lib/storage";

type Props = {
  active: boolean;
  onOpenApp: (appId: string) => void;
  time: string;
  date: string;
};

export default function HomeScreen({ active, onOpenApp, time, date }: Props) {
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  useEffect(() => {
    const saved = getHomeWallpaper();
    if (saved) setWallpaper(saved);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = r.result as string;
      setWallpaper(res);
      setHomeWallpaper(res);
    };
    r.readAsDataURL(f);
  };

  return (
    <section className={`screen home ${active ? "active" : ""} ${wallpaper ? "has-wallpaper" : ""}`} id="home">
      {wallpaper && <img className="home-bg" src={wallpaper} alt="" />}
      <section className="home-shell">
        <header className="home-top">
          <div className="home-clock">
            <b>{time}</b>
            <span>{date}</span>
          </div>
          <div className="home-actions">
            <label className="icon-btn" aria-label="Chọn hình nền màn hình chính">
              <input type="file" accept="image/*" onChange={handleFile} />
              <svg viewBox="0 0 48 48">
                <rect x="8" y="10" width="32" height="26" rx="7"></rect>
                <path d="M14 31l8-9 7 7 4-5 5 7"></path>
                <circle cx="31" cy="18" r="3"></circle>
              </svg>
            </label>
            <button className="icon-btn" onClick={() => onOpenApp("apiProxy")} aria-label="Mở API Proxy">
              <svg viewBox="0 0 48 48">
                <path d="M24 12v24M12 24h24"></path>
                <circle cx="24" cy="24" r="16"></circle>
              </svg>
            </button>
          </div>
        </header>
        
        <section className="home-widget">
          <img src="https://i.postimg.cc/1XZTm5bb/7c17cbf6c8bdfcd7112c2f8cd1900463.jpg" alt="" />
          <div className="widget-copy">
            <small>Widgetsmith · MinMin</small>
            <h2>Sweet writer dashboard</h2>
            <p>Màn hình chính chỉ hiện những app con đã được tạo thật.</p>
          </div>
        </section>
        
        <section className="home-pages">
          <div className="home-page">
            <button className="app-icon" onClick={() => onOpenApp("lipstick")}>
              <span className="app-bubble" style={{background: 'linear-gradient(145deg, #fff, #ffe1ec)', border: '1px solid rgba(220,105,150,0.28)', boxShadow: '0 10px 24px rgba(232,106,153,0.18)'}}>
                <div style={{
                  position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {/* Lipstick Body - deep purple/black */}
                  <div style={{
                    position: 'absolute', width: '17px', height: '14px',
                    borderRadius: '4px', background: '#3e333e',
                    left: '13px', bottom: '10px', transform: 'rotate(-28deg)',
                    boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.3)'
                  }}></div>
                  {/* Lipstick Gold Collar */}
                  <div style={{
                    position: 'absolute', width: '15px', height: '4px',
                    borderRadius: '1px', background: 'linear-gradient(90deg, #ffd700, #ffb6c1, #ffd700)',
                    left: '16px', bottom: '21px', transform: 'rotate(-28deg)'
                  }}></div>
                  {/* Lipstick Tip - deep pink */}
                  <div style={{
                    position: 'absolute', width: '12px', height: '22px',
                    borderRadius: '8px 8px 3px 3px', background: 'linear-gradient(180deg,#ff9dbc,#d23a73)',
                    left: '19px', top: '9px', transform: 'rotate(-28deg)',
                    boxShadow: 'inset -1px 0 2px rgba(255,255,255,0.4)'
                  }}></div>
                </div>
              </span>
              <span>୨ৎ Lipstick<br />Prompt</span>
            </button>
            <button className="app-icon" onClick={() => onOpenApp("promptMarkdown")}>
              <span className="app-bubble" style={{background: 'linear-gradient(135deg, #ffb6d0, #ff82b2)'}}>
                <svg viewBox="0 0 48 48">
                  <path fill="#ffffff" d="M24 40c-9 0-14-9-14-18 0-7 5-12 14-12s14 5 14 12c0 9-5 18-14 18z"></path>
                  <path fill="#7bc950" d="M24 6c-3 0-5 3-7 5 3-1 6-2 7-2 1 0 4 1 7 2-2-2-4-5-7-5z"></path>
                  <path fill="#7bc950" d="M24 6c-1 3-3 5-6 6 3-1 5-3 6-6z"></path>
                  <path fill="#7bc950" d="M24 6c1 3 3 5 6 6-3-1-5-3-6-6z"></path>
                  <circle fill="#ff82b2" cx="24" cy="22" r="1.5"></circle>
                  <circle fill="#ff82b2" cx="19" cy="26" r="1.5"></circle>
                  <circle fill="#ff82b2" cx="29" cy="26" r="1.5"></circle>
                  <circle fill="#ff82b2" cx="24" cy="30" r="1.5"></circle>
                  <circle fill="#ff82b2" cx="17" cy="20" r="1"></circle>
                  <circle fill="#ff82b2" cx="31" cy="20" r="1"></circle>
                </svg>
              </span>
              <span>୨ৎ Prompt Studio</span>
            </button>
            <button className="app-icon" onClick={() => onOpenApp("apiProxy")}>
              <span className="app-bubble">
                <svg viewBox="0 0 48 48">
                  <path d="M13 30c-4 0-7-3-7-7s3-7 7-7h3"></path>
                  <path d="M35 18c4 0 7 3 7 7s-3 7-7 7h-3"></path>
                  <path d="M17 24h14"></path>
                  <path d="M24 11v8M24 29v8"></path>
                </svg>
              </span>
              <span>୨ৎ Cài Đặt<br />API Proxy</span>
            </button>
          </div>
        </section>
        
        <div className="home-dots"><i></i></div>
        
        <nav className="home-dock">
          <button className="dock-item" onClick={() => onOpenApp("home")} aria-label="Trang chủ">
            <svg viewBox="0 0 48 48"><path d="M8 25L24 11l16 14v16H29V29H19v12H8z"></path></svg>
          </button>
          <button className="dock-item" onClick={() => onOpenApp("apiProxy")} aria-label="API Proxy">
            <svg viewBox="0 0 48 48"><path d="M13 30c-4 0-7-3-7-7s3-7 7-7h3M35 18c4 0 7 3 7 7s-3 7-7 7h-3M17 24h14"></path></svg>
          </button>
          <button className="dock-item is-muted" aria-label="Chưa mở">
            <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="14"></circle><path d="M18 24h12"></path></svg>
          </button>
          <button className="dock-item is-muted" aria-label="Chưa mở">
            <svg viewBox="0 0 48 48"><path d="M24 9l4 11 12 1-9 8 3 11-10-6-10 6 3-11-9-8 12-1z"></path></svg>
          </button>
        </nav>
      </section>
    </section>
  );
}
