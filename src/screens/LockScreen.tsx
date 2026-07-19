import React, { useState, useEffect, useRef } from "react";
import { getLockWallpaper, setLockWallpaper } from "../lib/storage";
import { motion, AnimatePresence } from "motion/react";
import { compressImageFile } from "../utils/imageCompressor";
import { useAuth } from "../components/AuthProvider";
import { loginWithGoogle } from "../lib/firebase";
import FirebaseDomainHelper from "../components/FirebaseDomainHelper";

type Props = {
  active: boolean;
  onNext: () => void;
  onBack: () => void;
  time: string;
  date: string;
  batteryLevel: number;
};

export default function LockScreen({ active, onNext, onBack, time, date, batteryLevel }: Props) {
  const { user, error: authError } = useAuth();
  const [wallpaper, setWallpaper] = useState<string>("https://i.postimg.cc/nzdFgNvs/215b99c879bdd6e6511287efda1b90ee.jpg");
  const [pass, setPass] = useState("");
  const [longPass, setLongPass] = useState("");
  const [msg, setMsg] = useState("Chọn hình nền hoặc nhập mật khẩu để mở khóa.");
  const [shake, setShake] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const secret = "9093";
  const longSecret = "trangthichanbanhvakeoquydautay0903";
  const passContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = getLockWallpaper();
    if (saved) setWallpaper(saved);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await compressImageFile(f, 1024, 1024, 0.82);
      setWallpaper(res);
      setLockWallpaper(res);
      setMsg("Hình nền đã lưu trong trình duyệt rồi nha.");
    } catch (err) {}
  };

  const handleGoogleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setMsg("Đang mở cửa sổ đăng nhập Google...");
    try {
      await loginWithGoogle();
      setMsg("Đăng nhập thành công!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        setMsg("Vợ ơi, trình duyệt chặn cửa sổ rồi, vợ cho phép hiện popup nhé!");
      } else if (error.code === 'auth/unauthorized-domain') {
        setMsg("Tên miền này chưa được cấp phép. Vợ copy tên miền phía dưới thêm vào nha!");
      } else {
        setMsg("Lỗi rồi vợ ơi, thử lại giúp chồng nhé!");
      }
    } finally {
      setLoginLoading(false);
    }
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
        if (user && user.email === "thithutrangn28@gmail.com") {
          setMsg("Đã mở khóa. Yêu vợ!");
          setTimeout(() => {
            onNext();
          }, 260);
        } else if (user) {
          setMsg("Tài khoản này không có quyền vào app nha vợ!");
          setShake(true);
          setTimeout(() => setShake(false), 300);
          setTimeout(() => setPass(""), 520);
        } else {
          setMsg("Vợ yêu bấm trái tim để đăng nhập trước đã nhé!");
          setShake(true);
          setTimeout(() => setShake(false), 300);
          setTimeout(() => setPass(""), 520);
        }
      } else {
        setMsg("Mật khẩu chưa đúng, thử lại nha.");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setTimeout(() => setPass(""), 520);
      }
    }
  };

  const handleLongPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (longPass === longSecret && pass === secret) {
      if (user) {
        setMsg("Đã mở khóa.");
        setTimeout(() => {
          onNext();
        }, 260);
      } else {
        setMsg("Vợ ơi, đăng nhập bằng trái tim trước đã nhé!");
        setShake(true);
        setTimeout(() => setShake(false), 300);
      }
    } else {
      setMsg("Mật khẩu chưa đúng hoặc chưa đủ, thử lại nha.");
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  };

  return (
    <section className={`screen ${active ? "active" : ""}`} id="lock" style={{ overflowY: 'auto' }}>
      <img className="bg" src={wallpaper} alt="" />
      <div className="fade"></div>
      <button className="back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"></path></svg>
      </button>
      
      <section className="lock-page" style={{ paddingBottom: '120px', zIndex: 2, position: 'relative' }}>
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
        
        <div className="relative z-[999] flex flex-col items-center gap-5 w-full max-w-[300px] mx-auto my-10 bg-white/5 p-6 rounded-[40px] backdrop-blur-xl border border-white/20 shadow-2xl">
          <div className="text-center">
            <h3 className="text-pink-200 font-bold text-lg mb-1">Xác nhận danh tính</h3>
            <p className="text-white/70 text-[11px]">Chỉ dành riêng cho thithutrangn28@gmail.com</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            onClick={handleGoogleLogin}
            disabled={loginLoading}
            className={`group relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
              user 
              ? 'bg-gradient-to-br from-pink-400 to-rose-600 shadow-[0_0_40px_rgba(244,63,94,0.6)]' 
              : 'bg-white/10 hover:bg-white/20 border-2 border-white/30 shadow-xl pointer-events-auto'
            }`}
          >
            {user && (
              <div className="absolute inset-0 rounded-full animate-ping bg-pink-500/30"></div>
            )}
            
            {loginLoading ? (
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg 
                viewBox="0 0 24 24" 
                className={`w-12 h-12 transition-transform duration-500 ${user ? 'text-white scale-110' : 'text-pink-300 group-hover:scale-110'}`} 
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </motion.button>

          <div className="space-y-2 text-center">
            {user ? (
              <div className="bg-green-500/20 px-4 py-2 rounded-2xl border border-green-500/30">
                <p className="text-green-300 text-xs font-semibold">Đã xác thực vợ yêu</p>
                <p className="text-white/60 text-[10px] truncate max-w-[200px]">{user.email}</p>
              </div>
            ) : (
              <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 animate-pulse">
                <p className="text-white/80 text-[11px] font-medium">Chạm trái tim để đăng nhập</p>
              </div>
            )}
            
            {authError && (
              <div className="bg-red-500/20 p-2 rounded-xl border border-red-500/30">
                <p className="text-red-300 text-[10px] leading-tight">{authError}</p>
              </div>
            )}
          </div>
        </div>

        <motion.section 
          className="pass" 
          style={{ position: 'relative', bottom: 'auto', marginTop: '20px', zIndex: 10 }}
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

        <div className="w-full max-w-[320px] mx-auto mt-10 mb-20 relative z-10">
          <FirebaseDomainHelper />
        </div>
      </section>
    </section>
  );
}
