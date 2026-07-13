import React, { useState, useEffect } from "react";
import { getHomeWallpaper, setHomeWallpaper } from "../lib/storage";
import { compressImageFile } from "../utils/imageCompressor";

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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await compressImageFile(f, 1024, 1024, 0.82);
      setWallpaper(res);
      setHomeWallpaper(res);
    } catch (err) {}
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
              <span className="app-bubble" style={{
                backgroundImage: "url('https://i.postimg.cc/SR6KbDxB/cb535764613eeef9220bea58d05babfd.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid #ff80ab',
                boxShadow: '0 8px 24px rgba(255,128,171,0.3)',
                position: 'relative'
              }}>
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-[23px]" />
              </span>
              <span>୨ৎ Lipstick<br />Prompt</span>
            </button>
            <button className="app-icon" onClick={() => onOpenApp("promptMarkdown")}>
              <span className="app-bubble" style={{
                backgroundImage: "url('https://i.postimg.cc/3x7vNDMv/f611dc0acb4f072dd942c38db713958f.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid #ff80ab',
                boxShadow: '0 8px 24px rgba(255,128,171,0.3)',
                position: 'relative'
              }}>
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-[23px]" />
              </span>
              <span>୨ৎ Prompt Studio</span>
            </button>
            <button className="app-icon" onClick={() => onOpenApp("apiProxy")}>
              <span className="app-bubble" style={{
                backgroundImage: "url('https://i.postimg.cc/RZVZ215j/6811e5166e7ea3f19264946a744997bf.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid #ff80ab',
                boxShadow: '0 8px 24px rgba(255,128,171,0.3)',
                position: 'relative'
              }}>
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-[23px]" />
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
