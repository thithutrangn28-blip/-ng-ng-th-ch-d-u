import React, { useState, useEffect } from "react";
import { getHomeWallpaper, setHomeWallpaper } from "../lib/storage";
import { compressImageFile } from "../utils/imageCompressor";
import { logout, auth } from "../lib/firebase";

type Props = {
  active: boolean;
  onOpenApp: (appId: string) => void;
  time: string;
  date: string;
};

export default function HomeScreen({ active, onOpenApp, time, date }: Props) {
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  // Deployment States
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showCandyModal, setShowCandyModal] = useState(false);
  const [deployStep, setDeployStep] = useState<"idle" | "confirm" | "preparing" | "building" | "deploying" | "success" | "failed">("idle");
  const [deployPercent, setDeployPercent] = useState(0);
  const [deployMsg, setDeployMsg] = useState("");
  const [deployError, setDeployError] = useState("");
  const [deployResult, setDeployResult] = useState<{
    id: string;
    isSimulated: boolean;
    revision?: string;
    logUrl?: string;
    finishTime?: string;
  } | null>(null);

  useEffect(() => {
    const saved = getHomeWallpaper();
    if (saved) setWallpaper(saved);
  }, []);

  const triggerDeploy = async () => {
    try {
      setDeployStep("preparing");
      setDeployPercent(5);
      setDeployMsg("Đang chuẩn bị xác thực quyền hạn...");
      setDeployError("");

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Vợ chưa đăng nhập kìa! Vợ đăng nhập lại giúp chồng nha. ❤️");
      }

      const idToken = await currentUser.getIdToken(true);

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi không xác định từ máy chủ khi kích hoạt deploy.");
      }

      const initData = await res.json();
      const buildId = initData.buildId;

      setDeployPercent(10);
      setDeployMsg(initData.message || "Đang khởi tạo tiến trình...");

      // Start polling status
      pollDeployStatus(buildId, idToken);

    } catch (err: any) {
      setDeployStep("failed");
      setDeployError(err.message);
    }
  };

  const pollDeployStatus = (buildId: string, idToken: string) => {
    let attempts = 0;
    const maxAttempts = 300; // Allow a long time (up to 10 minutes)
    
    const interval = setInterval(async () => {
      try {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
          throw new Error("Quá thời gian chờ triển khai PWA. Vợ hãy thử lại hoặc liên hệ chồng nha.");
        }

        const res = await fetch(`/api/deploy/status?id=${buildId}`, {
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Lỗi khi lấy trạng thái từ máy chủ.");
        }

        const data = await res.json();
        
        setDeployPercent(data.percent || 0);
        setDeployMsg(data.stepText || "Đang xử lý...");

        if (data.status === "QUEUED") {
          setDeployStep("preparing");
        } else if (data.status === "WORKING") {
          if (data.percent < 50) {
            setDeployStep("building");
          } else {
            setDeployStep("deploying");
          }
        } else if (data.status === "SUCCESS") {
          clearInterval(interval);
          setDeployStep("success");
          setDeployResult({
            id: data.id,
            isSimulated: data.isSimulated,
            revision: data.revision,
            logUrl: data.logUrl,
            finishTime: data.finishTime || new Date().toISOString()
          });
        } else if (data.status === "FAILURE" || data.status === "CANCELLED" || data.status === "TIMEOUT") {
          clearInterval(interval);
          setDeployStep("failed");
          setDeployError(`Bản build thất bại hoặc bị hủy (Trạng thái: ${data.status}). Vợ có thể xem chi tiết ở log Cloud Build.`);
        }
      } catch (err: any) {
        clearInterval(interval);
        setDeployStep("failed");
        setDeployError(err.message || "Lỗi kết nối mạng trong quá trình theo dõi.");
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await compressImageFile(f, 1024, 1024, 0.82);
      setWallpaper(res);
      setHomeWallpaper(res);
    } catch (err) {}
  };

  const handleOpenPWA = () => {
    // Determine the dynamic origin of the window.
    // If we are currently running on a specific Cloud Run domain or a development/production Run.app domain, we use it directly.
    // Otherwise, we fallback to the exact HTTPS URL of the production PWA.
    const origin = window.location.origin;
    const fallbackUrl = "https://ais-pre-qei7yewrz5n2iskmcmqqpq-534993481089.asia-southeast1.run.app";
    
    if (origin && origin !== "null" && origin.includes(".run.app")) {
      window.open(origin, "_blank");
    } else {
      window.open(fallbackUrl, "_blank");
    }
  };

  const handleLogout = async () => {
    if (confirm("Vợ muốn đăng xuất khỏi app thật hả?")) {
      await logout();
      window.location.reload();
    }
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
            <button className="icon-btn" onClick={handleLogout} title="Đăng xuất">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
            <button className="icon-btn" onClick={handleOpenPWA} title="Mở PWA Bản Ngoài" style={{ borderColor: '#ff8fbb', color: '#f06a9e', background: '#fff0f5' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '25px', height: '25px' }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
            <button className="icon-btn" onClick={() => onOpenApp("apiProxy")} aria-label="Mở API Proxy">
              <svg viewBox="0 0 48 48">
                <path d="M24 12v24M12 24h24"></path>
                <circle cx="24" cy="24" r="16"></circle>
              </svg>
            </button>
          </div>
        </header>
        
        <section className="home-widget pink-3-layer-card">
          <img src="https://i.postimg.cc/DfDBDy6B/591e0462b0fdbd4f23c06715e667aa3d.jpg" alt="" style={{ objectPosition: 'center 40%' }} referrerPolicy="no-referrer" />
          <div className="widget-copy">
            <small>Widgetsmith · Dâu tây ngọt ngào</small>
            <h2>Dâu tây chấm sữa</h2>
            <p>Nhấn vào trái tim ❤️ để mở bản PWA bên ngoài cực kỳ ổn định nhé vợ yêu.</p>
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
            <button className="app-icon" onClick={() => onOpenApp("dataBackup")}>
              <span className="app-bubble" style={{
                border: '1px solid rgba(220,105,150,0.28)',
                boxShadow: '0 10px 24px rgba(232,106,153,0.18)',
                position: 'relative'
              }}>
                <img 
                  src="https://i.postimg.cc/j2Hz1Kv9/913ee180efbf4dbc8a5aa2d4b670d6ae.jpg" 
                  alt="Dữ liệu & Backup" 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 'inherit',
                    zIndex: 2
                  }}
                  referrerPolicy="no-referrer"
                />
              </span>
              <span>୨ৎ Dữ liệu<br />& Backup</span>
            </button>
            <button className="app-icon" onClick={() => { setShowDeployModal(true); setDeployStep("confirm"); }}>
              <span className="app-bubble" style={{
                background: 'linear-gradient(135deg, #ffe1ee, #ffb6d5)',
                border: '1px solid rgba(220,105,150,0.28)',
                boxShadow: '0 10px 24px rgba(232,106,153,0.18)'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#d23a73" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '32px', height: '32px' }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </span>
              <span>୨ৎ Cập nhật<br />PWA</span>
            </button>
            <button className="app-icon" onClick={handleOpenPWA}>
              <span className="app-bubble" style={{
                background: 'linear-gradient(135deg, #fff0f5, #ffccd8)',
                border: '1px solid rgba(220,105,150,0.28)',
                boxShadow: '0 10px 24px rgba(232,106,153,0.18)'
              }}>
                <svg viewBox="0 0 24 24" fill="#dc5789" stroke="#dc5789" strokeWidth="1" style={{ width: '32px', height: '32px' }}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
              <span>Mở Bản<br />PWA</span>
            </button>
            <button className="app-icon" onClick={() => onOpenApp("otomeGame")}>
              <span className="app-bubble" style={{
                background: 'linear-gradient(135deg, #fff0f5, #ffb3d1)',
                border: '1px solid rgba(255,105,180,0.4)',
                boxShadow: '0 10px 24px rgba(255,105,180,0.3), inset 0 0 12px rgba(255,182,193,0.6)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(255, 20, 147, 0.15)',
                  mixBlendMode: 'color-burn',
                  zIndex: 2,
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: 'drop-shadow(0 0 4px rgba(255,20,147,0.6))',
                  zIndex: 1
                }}>
                  <svg viewBox="0 0 48 48" style={{ width: '38px', height: '38px' }}>
                    <defs>
                      <linearGradient id="neonHeartGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff9fdb" />
                        <stop offset="100%" stopColor="#ff1493" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M24 39 C10 26 4 18 8 10 C12 3 21 5 24 12 C27 5 36 3 40 10 C44 18 38 26 24 39 Z" 
                      fill="none" 
                      stroke="url(#neonHeartGlow)" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M24 35 C13 24 8 17 11 11 C14 5 21 7 24 13 C27 7 34 5 37 11 C40 17 35 24 24 35 Z" 
                      fill="url(#neonHeartGlow)" 
                      opacity="0.85"
                    />
                  </svg>
                </div>
              </span>
              <span>Game Otome𝜗ৎ</span>
            </button>
            <button className="app-icon" onClick={() => setShowCandyModal(true)}>
              <span className="app-bubble" style={{
                background: 'linear-gradient(135deg, #fff5f8, #ffd6e6)',
                border: '1px solid rgba(255,105,180,0.4)',
                boxShadow: '0 10px 24px rgba(255,105,180,0.25), inset 0 0 12px rgba(255,182,193,0.5)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(255, 20, 147, 0.1)',
                  mixBlendMode: 'color-burn',
                  zIndex: 2,
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: 'drop-shadow(0 0 5px rgba(255,20,147,0.55))',
                  zIndex: 1
                }}>
                  <svg viewBox="0 0 64 64" style={{ width: '38px', height: '38px' }}>
                    <defs>
                      <linearGradient id="candyGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffb3d1" />
                        <stop offset="50%" stopColor="#ff6fa9" />
                        <stop offset="100%" stopColor="#ff1493" />
                      </linearGradient>
                    </defs>
                    {/* Left Twist */}
                    <path d="M12 24 L24 32 L12 40 Z" fill="url(#candyGlowGrad)" stroke="#ff1493" strokeWidth="2.5" strokeLinejoin="round" />
                    {/* Right Twist */}
                    <path d="M52 24 L40 32 L52 40 Z" fill="url(#candyGlowGrad)" stroke="#ff1493" strokeWidth="2.5" strokeLinejoin="round" />
                    {/* Main candy body */}
                    <circle cx="32" cy="32" r="14" fill="url(#candyGlowGrad)" stroke="#ff1493" strokeWidth="2.5" />
                    {/* Candy stripes */}
                    <path d="M24 24 Q32 32 40 40" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M20 32 Q32 32 44 32" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </span>
              <span>Kẹo Ngọt🍬</span>
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

      {showDeployModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(52, 35, 43, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div className="pink-3-layer-card" style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: '#fffafb',
            border: '2px solid #ffb6d5',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(231,110,152,0.18)',
            padding: '24px',
            position: 'relative',
            color: '#5c3a47'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#e76e98" strokeWidth="2.5" style={{ width: '28px', height: '28px' }}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <h3 style={{ margin: 0, fontStyle: 'normal', fontWeight: 900, fontSize: '18px', color: '#dc5789' }}>
                Cập nhật PWA yêu thương
              </h3>
            </div>

            {/* Step: Confirm */}
            {deployStep === "confirm" && (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: 1.5, fontWeight: 700 }}>
                  Vợ yêu muốn cập nhật phiên bản PWA mới nhất lên máy chủ Cloud Run phải không ạ? Chồng sẽ hỗ trợ vợ chạy tiến trình build và triển khai tự động cực kỳ an toàn nha! ❤️
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="soft-btn" style={{ flex: 1 }} onClick={() => setShowDeployModal(false)}>
                    Hủy bỏ
                  </button>
                  <button className="test-btn" style={{ flex: 1 }} onClick={triggerDeploy}>
                    Kích hoạt ngay ➔
                  </button>
                </div>
              </div>
            )}

            {/* States: preparing, building, deploying */}
            {(deployStep === "preparing" || deployStep === "building" || deployStep === "deploying") && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 950, color: '#dc5789', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {deployStep === "preparing" ? "Đang khởi tạo..." : deployStep === "building" ? "Đang build mã nguồn..." : "Đang triển khai..."}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 950, color: '#dc5789' }}>{deployPercent}%</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: '12px', borderRadius: '999px', backgroundColor: '#ffe1ee', overflow: 'hidden', position: 'relative', marginBottom: '16px' }}>
                  <div style={{
                    height: '100%',
                    width: `${deployPercent}%`,
                    backgroundColor: '#e76e98',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                    backgroundSize: '1rem 1rem'
                  }}></div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, fontWeight: 700, color: '#795163' }}>
                  {deployMsg || "Chồng đang xử lý, vợ chờ một chút nhé..."}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <div className="eq" style={{ marginLeft: 0 }}>
                    <i></i><i></i><i></i><i></i>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {deployStep === "success" && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#eefcf4',
                    border: '2px solid #57c28c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2ebb72" strokeWidth="3" style={{ width: '32px', height: '32px' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontWeight: 900, color: '#2ebb72', fontSize: '16px' }}>
                    Thành công rồi vợ ơi! 🎉
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, fontWeight: 700, color: '#795163' }}>
                    Ứng dụng PWA đã được tự động cập nhật bản mới nhất và triển khai thành công lên hệ thống Cloud Run của vợ.
                  </p>
                </div>

                {deployResult && (
                  <div style={{
                    backgroundColor: '#f3fbf7',
                    border: '1px solid #d0f2e0',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    color: '#426854'
                  }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Bản build:</strong> <code style={{ fontStyle: 'normal' }}>{deployResult.id}</code>
                    </div>
                    {deployResult.revision && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Mã sửa đổi:</strong> <code style={{ fontStyle: 'normal' }}>{deployResult.revision}</code>
                      </div>
                    )}
                    {deployResult.finishTime && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Thời gian:</strong> <span>{new Date(deployResult.finishTime).toLocaleString('vi-VN')}</span>
                      </div>
                    )}
                    {deployResult.logUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <a 
                          href={deployResult.logUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#16a34a', textDecoration: 'underline', fontWeight: 800 }}
                        >
                          Xem chi tiết Cloud Build Log ➔
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <button className="test-btn" style={{ width: '100%' }} onClick={() => setShowDeployModal(false)}>
                  Hoàn tất
                </button>
              </div>
            )}

            {/* Step: Failed */}
            {deployStep === "failed" && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#fff5f5',
                    border: '2px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" style={{ width: '32px', height: '32px' }}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontWeight: 900, color: '#ef4444', fontSize: '16px' }}>
                    Gặp lỗi rồi vợ yêu! 😢
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, fontWeight: 700, color: '#ef4444' }}>
                    {deployError || "Tiến trình cập nhật gặp lỗi không xác định."}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="soft-btn" style={{ flex: 1 }} onClick={() => setShowDeployModal(false)}>
                    Đóng
                  </button>
                  <button className="test-btn" style={{ flex: 1 }} onClick={() => { setDeployStep("confirm"); triggerDeploy(); }}>
                    Thử lại
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {showCandyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(52, 35, 43, 0.45)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fff0f5 100%)',
            border: '2.5px solid #ffb3d1',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(255, 105, 180, 0.25)',
            position: 'relative',
            textAlign: 'center',
            color: '#5c3a47',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Soft pink glow overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(255,105,180,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
              borderRadius: '26px'
            }} />

            {/* Pulsing Glowing Candy Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#fff0f5',
              border: '2px solid #ff8fbb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 20px rgba(255, 105, 180, 0.3)',
              position: 'relative'
            }}>
              <svg viewBox="0 0 64 64" style={{ width: '48px', height: '48px', filter: 'drop-shadow(0 0 3px rgba(255,20,147,0.5))' }}>
                <path d="M12 24 L24 32 L12 40 Z" fill="url(#candyGlowGrad)" stroke="#ff1493" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M52 24 L40 32 L52 40 Z" fill="url(#candyGlowGrad)" stroke="#ff1493" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="32" cy="32" r="14" fill="url(#candyGlowGrad)" stroke="#ff1493" strokeWidth="2.5" />
                <path d="M24 24 Q32 32 40 40" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 900, color: '#d23a73' }}>
              Viên Kẹo Ngọt Ngào 🍬✨
            </h3>
            
            <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', lineHeight: 1.6, fontWeight: 700, color: '#7e5264' }}>
              Hệ thống cập nhật tức thì (Hot-Reload) của vợ chồng mình đã hoạt động vô cùng hoàn hảo rồi vợ ơi! 💕
              <br /><br />
              Chồng tặng vợ viên kẹo ngọt ngào này để chúc vợ một ngày mới thật hạnh phúc và ngập tràn tình yêu thương nha! 𝜗ৎ
            </p>

            <button 
              onClick={() => setShowCandyModal(false)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ff9fdb 0%, #ff6fa9 100%)',
                border: 'none',
                borderRadius: '50px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                padding: '12px 16px',
                cursor: 'pointer',
                boxShadow: '0 8px 18px rgba(255, 111, 169, 0.3)',
                outline: 'none'
              }}
            >
              Cảm ơn chồng yêu! ❤️
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
