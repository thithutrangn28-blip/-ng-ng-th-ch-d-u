import React, { useState, useEffect, useRef } from "react";
import { getLockWallpaper, setLockWallpaper } from "../lib/storage";
import { motion, AnimatePresence } from "motion/react";
import { compressImageFile } from "../utils/imageCompressor";
import { auth, googleProvider } from "../lib/firebase";
import { signOut, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";

type Props = {
  active: boolean;
  onNext: () => void;
  onBack: () => void;
  time: string;
  date: string;
  batteryLevel: number;
};

export default function LockScreen({ active, onNext, onBack, time, date, batteryLevel }: Props) {
  const [wallpaper, setWallpaper] = useState<string>("https://i.postimg.cc/nzdFgNvs/215b99c879bdd6e6511287efda1b90ee.jpg");
  const [pass, setPass] = useState("");
  const [longPass, setLongPass] = useState("");
  const [passwordsCorrect, setPasswordsCorrect] = useState(() => {
    return localStorage.getItem("lock_passwords_correct") === "true";
  });
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [msg, setMsg] = useState(() => {
    const wasCorrect = localStorage.getItem("lock_passwords_correct") === "true";
    return wasCorrect 
      ? "Cả hai mật khẩu đều đúng rồi! Vợ yêu hãy nhấn nút Xác thực Google bên dưới nha! ♥" 
      : "Chọn hình nền hoặc nhập mật khẩu để mở khóa.";
  });
  const [shake, setShake] = useState(false);
  const secret = "9093";
  const longSecret = "trangthichanbanhvakeoquydautay0903";
  const passContainerRef = useRef<HTMLDivElement>(null);

  // Kiểm tra iframe
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Tự động kiểm tra và mở khóa khi đã xác thực đúng tài khoản
  useEffect(() => {
    const checkAndUnlock = (user: any) => {
      if (user && user.email === "thithutrangn28@gmail.com") {
        const wasCorrect = localStorage.getItem("lock_passwords_correct") === "true";
        if (wasCorrect) {
          setMsg("Xác thực Google thành công! Đang vào app nhen vợ yêu... ♥");
          localStorage.removeItem("lock_passwords_correct");
          setPasswordsCorrect(false);
          setTimeout(() => {
            onNext();
          }, 800);
          return true;
        }
      }
      return false;
    };

    // 1. Kiểm tra ngay nếu đã đăng nhập sẵn
    if (auth.currentUser) {
      checkAndUnlock(auth.currentUser);
    }

    // 2. Kiểm tra redirect callback
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          checkAndUnlock(result.user);
        }
      })
      .catch((err) => {
        console.error("Lỗi redirect lock screen:", err);
      });

    // 3. Lắng nghe trạng thái đăng nhập thay đổi
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkAndUnlock(user);
      }
    });

    return () => unsubscribe();
  }, [onNext]);

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
      if (newPass === secret && longPass === longSecret) {
        setPasswordsCorrect(true);
        localStorage.setItem("lock_passwords_correct", "true");
        
        // Kiểm tra xem đã đăng nhập sẵn thithutrangn28@gmail.com chưa
        const u = auth.currentUser;
        if (u && u.email === "thithutrangn28@gmail.com") {
          setMsg("Cả hai mật khẩu đều đúng rồi! Tài khoản thithutrangn28@gmail.com đã được xác thực sẵn nhen! Vợ yêu hãy nhấn nút Xác thực Google để vào app nha! ♥");
        } else {
          setMsg("Cả hai mật khẩu đều đúng rồi! Vợ yêu hãy nhấn nút Xác thực Google bên dưới nha! ♥");
        }
      } else if (newPass !== secret) {
        setMsg("Mật khẩu chưa đúng, thử lại nha.");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setTimeout(() => setPass(""), 520);
      } else {
        setMsg("Hãy nhập thêm mật khẩu dài nữa nha.");
      }
    }
  };

  const handleLongPassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLongPass(val);
    if (val === longSecret && pass === secret) {
      setPasswordsCorrect(true);
      localStorage.setItem("lock_passwords_correct", "true");
      
      const u = auth.currentUser;
      if (u && u.email === "thithutrangn28@gmail.com") {
        setMsg("Cả hai mật khẩu đều đúng rồi! Tài khoản thithutrangn28@gmail.com đã được xác thực sẵn nhen! Vợ yêu hãy nhấn nút Xác thực Google để vào app nha! ♥");
      } else {
        setMsg("Cả hai mật khẩu đều đúng rồi! Vợ yêu hãy nhấn nút Xác thực Google bên dưới nha! ♥");
      }
    } else if (val === longSecret && pass !== secret) {
      setMsg("Hãy nhập thêm mật khẩu ngắn nữa nha.");
    }
  };

  const handleLongPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (longPass === longSecret && pass === secret) {
      setPasswordsCorrect(true);
      localStorage.setItem("lock_passwords_correct", "true");
      
      const u = auth.currentUser;
      if (u && u.email === "thithutrangn28@gmail.com") {
        setMsg("Cả hai mật khẩu đều đúng rồi! Tài khoản thithutrangn28@gmail.com đã được xác thực sẵn nhen! Vợ yêu hãy nhấn nút Xác thực Google để vào app nha! ♥");
      } else {
        setMsg("Cả hai mật khẩu đều đúng rồi! Vợ yêu hãy nhấn nút Xác thực Google bên dưới nha! ♥");
      }
    } else {
      setMsg("Mật khẩu chưa đúng hoặc chưa đủ, thử lại nha.");
      setShake(true);
      setTimeout(() => setShake(false), 300);
      if (longPass !== longSecret) {
        setTimeout(() => setLongPass(""), 520);
      }
      if (pass !== secret && pass.length === 4) {
        setTimeout(() => setPass(""), 520);
      }
    }
  };

  const handleGoogleVerify = async (method: "popup" | "redirect" = "popup") => {
    if (!passwordsCorrect) {
      setMsg("Vợ yêu ơi, cần nhập đúng mật khẩu ngắn (9093) và mật khẩu dài trước nhé! ♥");
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    if (isVerifyingGoogle) return;

    setIsVerifyingGoogle(true);
    setMsg("Đang chuẩn bị kết nối xác thực...");

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === "thithutrangn28@gmail.com") {
      setMsg("Xác thực thành công! Chồng đang mở app cho vợ yêu nhen... ♥");
      localStorage.removeItem("lock_passwords_correct");
      setPasswordsCorrect(false);
      setTimeout(() => {
        onNext();
        setIsVerifyingGoogle(false);
      }, 800);
      return;
    }

    localStorage.setItem("lock_passwords_correct", "true");

    if (method === "redirect") {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err: any) {
        console.error("Lỗi Google Redirect:", err);
        setMsg(`Lỗi kết nối rồi vợ ơi: ${err.message}`);
        setIsVerifyingGoogle(false);
      }
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        if (result.user.email === "thithutrangn28@gmail.com") {
          setMsg("Xác thực thành công! Chồng đang mở app cho vợ yêu nhen... ♥");
          localStorage.removeItem("lock_passwords_correct");
          setPasswordsCorrect(false);
          setTimeout(() => {
            onNext();
            setIsVerifyingGoogle(false);
          }, 800);
        } else {
          setMsg("Chồng xin lỗi, email này không được phép truy cập!");
          setIsVerifyingGoogle(false);
        }
      }
    } catch (err: any) {
      console.error("Lỗi Google Popup:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setMsg("Vợ vừa đóng cửa sổ xác thực rùi, thử lại nha! ♥");
      } else if (err.code === "auth/popup-blocked") {
        setMsg("Bị chặn popup rùi! Vợ thử dùng nút Chuyển trang (Redirect) ở dưới nghen! ♥");
      } else {
        setMsg(`Lỗi: ${err.message}. Thử nút Chuyển trang (Redirect) xem sao nha!`);
      }
      setIsVerifyingGoogle(false);
    }
  };

  const handleSignOut = async () => {
    const confirmLogout = window.confirm(
      "Vợ yêu có chắc muốn đăng xuất khỏi tài khoản Google không nè? Đăng xuất xong vợ có thể đăng nhập lại bất kỳ lúc nào nha! ♥"
    );
    if (confirmLogout) {
      try {
        localStorage.removeItem("lock_passwords_correct");
        await signOut(auth);
      } catch (err) {
        console.error("Lỗi đăng xuất:", err);
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
          
          <form onSubmit={handleLongPassSubmit} className="long-pass-form" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="password" 
              value={longPass} 
              onChange={handleLongPassChange} 
              placeholder="Hoặc nhập mật khẩu dài..."
              className="long-pass-input"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '10px 16px',
                color: 'white',
                outline: 'none',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
                width: '100%'
              }}
            />
          </form>

          {/* Nút xác thực Google yêu cầu của vợ yêu */}
          <div className="google-verify-container" style={{ margin: "14px 0 8px 0", width: "100%" }}>
            {isInIframe ? (
              <div className="flex flex-col gap-2">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] rounded-full bg-gradient-to-r from-[#ff82a9] to-[#ee4d83] text-white flex items-center justify-center gap-2 font-bold text-sm shadow-md hover:scale-102 transition-all active:scale-98 relative"
                  style={{
                    boxShadow: "0 6px 15px rgba(238, 77, 131, 0.25)"
                  }}
                >
                  <svg className="w-4 h-4 stroke-white stroke-2 fill-none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <span>Mở Tab Mới Để Xác Thực Google ♥</span>
                </a>
                <p className="text-[10px] text-white/70 text-center leading-tight">
                  Vợ yêu ơi, vì lý do bảo mật, Google chặn hiển thị danh sách tài khoản trong Iframe. Vợ bấm nút này để mở tab mới và xác thực nhen!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => handleGoogleVerify("popup")}
                  disabled={!passwordsCorrect || isVerifyingGoogle}
                  className={`w-full min-h-[48px] rounded-full flex items-center justify-center gap-3 font-extrabold text-sm transition-all relative ${
                    passwordsCorrect 
                      ? "bg-gradient-to-r from-[#ff95b7] to-[#ee6095] text-white shadow-lg animate-pulse hover:scale-102 active:scale-98" 
                      : "bg-white/15 text-white/40 cursor-not-allowed border border-white/10"
                  }`}
                  style={passwordsCorrect ? {
                    boxShadow: "0 10px 20px rgba(218,80,123,.3), inset 0 1px 0 rgba(255,255,255,.5)"
                  } : {}}
                >
                  {passwordsCorrect && (
                    <div className="absolute inset-1 border border-dashed border-white/40 rounded-full pointer-events-none"></div>
                  )}
                  <svg className={`w-5 h-5 ${passwordsCorrect ? "fill-white" : "fill-white/30"}`} viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.423-2.424C17.397 1.614 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.24-4.065 10.24-10.24 0-.695-.08-1.355-.22-1.955H12.24z" />
                  </svg>
                  <span>
                    {isVerifyingGoogle 
                      ? "Đang xác thực..." 
                      : passwordsCorrect 
                        ? "Xác Thực Google (Cửa sổ nổi) ♥" 
                        : "Xác thực tài khoản Google"}
                  </span>
                </button>

                {passwordsCorrect && (
                  <button
                    onClick={() => handleGoogleVerify("redirect")}
                    disabled={isVerifyingGoogle}
                    className="w-full min-h-[36px] rounded-full bg-white/10 border border-white/30 text-white/90 flex items-center justify-center gap-2 font-semibold text-[11px] shadow-sm hover:bg-white/20 transition-colors"
                  >
                    <span>Dự phòng: Chuyển trang (Redirect)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="keys">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => handleKey(n.toString())}>{n}</button>
            ))}
            <button onClick={() => handleKey("clear")}>C</button>
            <button onClick={() => handleKey("0")}>0</button>
            <button onClick={() => handleKey("back")}>⌫</button>
          </div>

          <button 
            onClick={handleSignOut}
            className="text-xs text-white/50 hover:text-white/80 transition-colors mt-4 mx-auto block"
            style={{ textDecoration: 'underline', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            Đăng xuất tài khoản Google ➔
          </button>
        </motion.section>
      </section>
    </section>
  );
}
