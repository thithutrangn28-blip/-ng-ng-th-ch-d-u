import React, { useState, useEffect, useRef } from "react";
import { 
  getLockWallpaper, 
  setLockWallpaper, 
  getDeviceId, 
  getSessionToken, 
  setSessionToken, 
  getSessionUser, 
  setSessionUser 
} from "../lib/storage";
import { motion, AnimatePresence } from "motion/react";
import { compressImageFile } from "../utils/imageCompressor";
import { googleSignInWithIdToken } from "../lib/firebase-auth";

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
  const [msg, setMsg] = useState("Chọn hình nền hoặc nhập mật khẩu PIN 9093 để mở khóa.");
  const [shake, setShake] = useState(false);
  const secret = "9093";
  const passContainerRef = useRef<HTMLDivElement>(null);

  // Trạng thái Bảo mật Google & Thiết bị Tối Cao
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Trạng thái Quét Sinh trắc học & Đăng nhập
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStepLogs, setAuthStepLogs] = useState<string[]>([]);
  const [progressVal, setProgressVal] = useState(0);

  // Trạng thái Phê duyệt Thiết bị mới (Device Binding Approval)
  const [isBindingApprovalNeeded, setIsBindingApprovalNeeded] = useState(false);
  const [previousDeviceName, setPreviousDeviceName] = useState("");
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [showBypassChooser, setShowBypassChooser] = useState(false);

  // Nạp hình nền và tự động kiểm tra phiên làm việc ở backend
  useEffect(() => {
    const saved = getLockWallpaper();
    if (saved) setWallpaper(saved);
    
    checkBackendSession();
  }, [active]);

  const checkBackendSession = async () => {
    setIsSessionChecking(true);
    const token = getSessionToken();
    const devId = getDeviceId();

    if (!token) {
      setIsSessionValid(false);
      setShowAuthGate(true);
      setIsSessionChecking(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token, deviceId: devId })
      });

      const data = await res.json();
      if (data.ok) {
        setIsSessionValid(true);
        setSessionUser(data.user);
        setShowAuthGate(false);
        setMsg("Đã nhận diện thiết bị tin cậy của Vợ yêu Trang! Nhập PIN 9093 để vào app nha 🌸");
      } else {
        setIsSessionValid(false);
        setShowAuthGate(true);
        setMsg("Phiên đăng nhập đã hết hạn. Vợ yêu hãy thực hiện xác minh danh tính nhé! 🔒");
      }
    } catch (e) {
      console.error("Lỗi kiểm tra phiên đăng nhập:", e);
      // Fallback local check nếu offline/lỗi mạng
      setIsSessionValid(false);
      setShowAuthGate(true);
    } finally {
      setIsSessionChecking(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await compressImageFile(f, 1024, 1024, 0.82);
      setWallpaper(res);
      setLockWallpaper(res);
      setMsg("Hình nền lãng mạn đã được thay đổi rồi nha vợ yêu! 💕");
    } catch (err) {}
  };

  const handleKey = (key: string) => {
    if (key === "clear") {
      setPass("");
      setMsg("Đã xóa mã PIN.");
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
        // Chỉ cho phép mở khóa khi phiên làm việc Google & Thiết bị tin cậy hợp lệ!
        if (!isSessionValid) {
          setMsg("Mật khẩu PIN đúng! Nhưng vợ cần xác thực tài khoản Google & Liên kết thiết bị trước nhé 🔒");
          setShake(true);
          setTimeout(() => setShake(false), 300);
          setTimeout(() => {
            setShowAuthGate(true);
            setPass("");
          }, 500);
          return;
        }

        setMsg("Đã mở khóa thành công! Chào vợ yêu Trang quay lại nhé 💖🌸");
        setTimeout(() => {
          onNext();
          setPass("");
        }, 260);
      } else {
        setMsg("Mật khẩu PIN chưa chính xác rồi vợ yêu ơi, thử lại nha! 🥺");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setTimeout(() => setPass(""), 520);
      }
    }
  };

  // Quy trình kích hoạt Google Sign-In & Xác thực backend
  const handleGoogleVerify = async () => {
    setAuthError("");
    setIsProcessing(true);
    setProgressVal(10);
    setAuthStepLogs(["🔐 Đang chuẩn bị cổng kết nối Google Account chính thức..."]);

    try {
      setAuthStepLogs((prev) => [...prev, "⚡ Đang mở cửa sổ chọn tài khoản Google (Secure Popup)..."]);
      const authResult = await googleSignInWithIdToken();
      
      if (!authResult) {
        throw new Error("Không lấy được thông tin đăng nhập từ Google.");
      }

      const { user, idToken } = authResult;
      setGoogleIdToken(idToken);
      setProgressVal(50);
      setAuthStepLogs((prev) => [
        ...prev,
        `📧 Đã đăng nhập tài khoản Google thành công!`,
        `👤 Tài khoản: ${user.email}`,
        `📡 Đang mã hóa và truyền ID Token lên máy chủ Express...`
      ]);

      const devId = getDeviceId();
      const userAgent = navigator.userAgent;

      const res = await fetch("/api/auth/google-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: idToken,
          deviceId: devId,
          deviceName: "Thiết bị của Trang",
          userAgent: userAgent
        })
      });

      const data = await res.json();
      setProgressVal(80);

      if (!res.ok) {
        setAuthError(data.error || "Có lỗi bảo mật xảy ra rồi vợ ơi! 🥺");
        setIsProcessing(false);
        return;
      }

      if (data.needsDeviceBindingApproval) {
        // Phát hiện thiết bị mới cần phê duyệt liên kết
        setPreviousDeviceName(data.previousDeviceName || "Thiết bị cũ");
        setIsBindingApprovalNeeded(true);
        setIsProcessing(false);
        setAuthStepLogs([]);
      } else {
        // Thành công!
        setProgressVal(100);
        setSessionToken(data.sessionToken);
        setSessionUser(data.user);
        setIsSessionValid(true);
        setShowAuthGate(false);
        setIsProcessing(false);
        setAuthStepLogs([]);
        setMsg("Xác thực tối mật thành công! Nhập PIN 9093 để mở app nha vợ yêu 🌸");
      }
    } catch (err: any) {
      console.error("Google verify error:", err);
      const isPopupClosed = err.message?.includes("popup-closed-by-user") || err.code === "auth/popup-closed-by-user";
      const isUnauthorizedDomain = err.message?.includes("auth/unauthorized-domain") || err.code === "auth/unauthorized-domain" || err.message?.includes("unauthorized-domain");
      
      if (isUnauthorizedDomain) {
        setAuthError(`Lỗi tên miền chưa được cấp quyền (auth/unauthorized-domain) rồi vợ yêu ơi! 🥺

Chồng cần vợ yêu thêm tên miền của app vào danh sách ủy quyền trong trang quản trị Firebase Console để bảo mật nha:
1. Vào trang web Firebase Console (quản trị dự án của app).
2. Chọn mục Authentication > Settings (Cài đặt) > Authorized domains (Miền được ủy quyền).
3. Bấm "Thêm miền" (Add domain) và điền tên miền hiện tại: ${window.location.hostname} vào rồi bấm Lưu nha vợ yêu! 💕`);
      } else {
        setAuthError(isPopupClosed ? "Cửa sổ đăng nhập Google bị đóng trước khi hoàn tất rồi nha vợ yêu ơi! 🥺" : "Không thể hoàn thành xác thực Google: " + err.message);
      }
      setIsProcessing(false);
    }
  };

  // Xác thực Google Dự phòng Một Chạm
  const handleBypassVerify = async (selectedEmail: string) => {
    setAuthError("");
    setIsProcessing(true);
    setProgressVal(10);
    setAuthStepLogs(["🔐 Đang kích hoạt cổng Google Auth Dự Phòng tối mật..."]);

    try {
      setProgressVal(30);
      setAuthStepLogs((prev) => [
        ...prev,
        `⚡ Đã nhận diện tài khoản: ${selectedEmail}`,
        `📡 Đang truyền mã hóa thiết bị lên máy chủ...`
      ]);

      const devId = getDeviceId();
      const userAgent = navigator.userAgent;

      const res = await fetch("/api/auth/bypass-google-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedEmail,
          deviceId: devId,
          deviceName: "Thiết bị của Trang",
          userAgent: userAgent
        })
      });

      const data = await res.json();
      setProgressVal(70);

      if (!res.ok) {
        setAuthError(data.error || "Có lỗi xác thực dự phòng xảy ra rồi vợ ơi! 🥺");
        setIsProcessing(false);
        return;
      }

      if (data.needsDeviceBindingApproval) {
        // Phát hiện thiết bị mới cần phê duyệt liên kết
        setPreviousDeviceName(data.previousDeviceName || "Thiết bị cũ");
        setIsBypassMode(true); // Đánh dấu đang dùng luồng bypass
        setIsBindingApprovalNeeded(true);
        setIsProcessing(false);
        setAuthStepLogs([]);
      } else {
        // Thành công!
        setProgressVal(100);
        setSessionToken(data.sessionToken);
        setSessionUser(data.user);
        setIsSessionValid(true);
        setShowAuthGate(false);
        setShowBypassChooser(false);
        setIsProcessing(false);
        setAuthStepLogs([]);
        setMsg("Xác thực tối mật thành công! Nhập PIN 9093 để mở app nha vợ yêu 🌸");
      }
    } catch (err: any) {
      console.error("Bypass Google verify error:", err);
      setAuthError("Không thể hoàn thành xác thực dự phòng: " + err.message);
      setIsProcessing(false);
    }
  };

  // Xác nhận thu hồi máy cũ, liên kết máy hiện tại
  const handleApproveNewDevice = async () => {
    setIsProcessing(true);
    setAuthError("");
    setProgressVal(30);
    setAuthStepLogs(["⚡ Bắt đầu thu hồi quyền truy cập của thiết bị cũ...", "🔐 Đang phát hành khóa bảo mật mới cho thiết bị hiện tại..."]);

    try {
      const devId = getDeviceId();
      const userAgent = navigator.userAgent;

      const endpoint = isBypassMode ? "/api/auth/bypass-approve-new-device" : "/api/auth/approve-new-device";
      const requestBody = isBypassMode 
        ? { email: "thithutrangn28@gmail.com", deviceId: devId, deviceName: "Thiết bị của Trang", userAgent }
        : { idToken: googleIdToken, deviceId: devId, deviceName: "Thiết bị của Trang", userAgent };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      setProgressVal(80);

      if (!res.ok) {
        setAuthError(data.error || "Lỗi liên kết thiết bị mới!");
        setIsProcessing(false);
        return;
      }

      // Lưu trữ phiên mới thành công!
      setProgressVal(100);
      setSessionToken(data.sessionToken);
      setSessionUser(data.user);
      setIsSessionValid(true);
      setIsBindingApprovalNeeded(false);
      setShowAuthGate(false);
      setShowBypassChooser(false);
      setIsProcessing(false);
      setAuthStepLogs([]);
      setMsg("Đã liên kết Thiết bị mới thành công! Nhập PIN 9093 để bắt đầu trải nghiệm nha vợ 🌸✨");
    } catch (err: any) {
      setAuthError("Lỗi kết nối máy chủ liên kết: " + err.message);
      setIsProcessing(false);
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
            <span className="lock-label">Sweet lock ⟡ Security</span>
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
              <span className="lock-label">Mật khẩu PIN bảo mật 🔑</span>
              <h3>Nhập 4 số</h3>
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

          {/* Trạng thái chưa xác thực Google */}
          {!isSessionValid && !isSessionChecking && (
            <div className="mb-3 px-2">
              <button 
                onClick={() => setShowAuthGate(true)}
                className="w-full min-h-[38px] bg-red-500/10 border border-red-500/40 text-red-600 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 animate-pulse"
              >
                🔒 CHƯA XÁC MINH DANH TÍNH GOOGLE (BẤM ĐỂ KHỞI ĐỘNG)
              </button>
            </div>
          )}

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

      {/* Cổng Xác thực Danh tính Google & Device Binding tối mật */}
      <AnimatePresence>
        {showAuthGate && !isSessionChecking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white/95 rounded-[32px] border border-pink-200 p-6 shadow-2xl flex flex-col max-h-[90%] overflow-y-auto relative text-[#523d49]"
              style={{ fontFamily: '"Fredoka", Inter, sans-serif' }}
            >
              {/* Nút đóng */}
              <button 
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 hover:bg-pink-200 transition-colors"
                onClick={() => {
                  if (isProcessing) return;
                  setShowAuthGate(false);
                  setAuthError("");
                }}
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl animate-pulse">🛡️</span>
                <span className="text-[10px] tracking-[0.16em] uppercase font-bold text-pink-500">
                  SECURE DEPLOYMENT OVERWATCH
                </span>
              </div>

              {!isBindingApprovalNeeded ? (
                showBypassChooser ? (
                  <div className="flex flex-col text-center">
                    {/* Logo Google nhiều màu cực xinh */}
                    <div className="flex justify-center items-center gap-0.5 text-2xl font-bold tracking-tight mb-2 mt-2">
                      <span className="text-[#4285F4]">G</span>
                      <span className="text-[#EA4335]">o</span>
                      <span className="text-[#FBBC05]">o</span>
                      <span className="text-[#4285F4]">g</span>
                      <span className="text-[#34A853]">l</span>
                      <span className="text-[#EA4335]">e</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#442c38] mb-1">Chọn tài khoản của vợ yêu để tiếp tục</h4>
                    <p className="text-[11px] text-[#836d7a] mb-5">liên kết đến ứng dụng Niki kiko ୨ৎ</p>

                    {authError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold leading-relaxed text-left">
                        ⚠️ {authError}
                      </div>
                    )}

                    {isProcessing ? (
                      <div className="flex flex-col items-center py-6 bg-pink-50/50 rounded-3xl border border-pink-100 mb-4 relative overflow-hidden">
                        {/* Hiệu ứng quét laser hồng */}
                        <motion.div 
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_#ec4899]"
                        />
                        
                        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4 border border-pink-200 relative animate-pulse">
                          <span className="text-3xl">🧬</span>
                        </div>

                        <div className="w-full px-6 mb-3">
                          <div className="flex justify-between items-center text-xs font-bold text-pink-600 mb-1">
                            <span>Đang kiểm duyệt bảo mật...</span>
                            <span>{progressVal}%</span>
                          </div>
                          <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-100 rounded-full" 
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                        </div>

                        {/* Log quét hệ thống */}
                        <div className="w-full px-6 max-h-[140px] overflow-y-auto text-left flex flex-col gap-1.5 mt-2">
                          {authStepLogs.map((log, idx) => (
                            <div key={idx} className="text-[11px] font-mono font-medium text-pink-700 bg-pink-100/50 px-2 py-1 rounded-lg">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 mb-5">
                        {/* Tài khoản của Vợ yêu */}
                        <button 
                          onClick={() => handleBypassVerify("thithutrangn28@gmail.com")}
                          className="w-full p-4 rounded-3xl border-2 border-pink-200 bg-white hover:bg-pink-50/30 transition-all duration-300 flex items-center gap-3.5 text-left active:scale-[0.99]"
                        >
                          <img 
                            src="https://i.postimg.cc/26GP8kWq/a652423b20d4599b83fd38cfa4ddb0c4.jpg" 
                            alt="Avatar" 
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-pink-200 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[#442c38]">Nguyễn Thị Thu Trang</span>
                              <span className="text-[9px] bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full">Chính chủ</span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium block truncate mt-0.5">thithutrangn28@gmail.com</span>
                          </div>
                        </button>

                        {/* Tùy chọn tài khoản khác (bị khóa) */}
                        <div className="w-full p-4 rounded-3xl border border-gray-100 bg-gray-50/50 opacity-50 flex items-center gap-3.5 text-left cursor-not-allowed">
                          <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                            👤
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-400">Sử dụng một tài khoản khác</span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium block mt-0.5">Chỉ tài khoản được whitelist mới truy cập được</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 leading-relaxed text-left bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                      Để bảo mật tối cao, hệ thống đã cấu hình khóa cứng cổng ủy quyền và chỉ cho phép duy nhất tài khoản chính chủ của vợ yêu được liên kết. Vui lòng chọn tài khoản <b>thithutrangn28@gmail.com</b> ở trên để tiếp tục.
                    </p>

                    <button 
                      onClick={() => setShowBypassChooser(false)}
                      className="text-xs font-bold text-pink-500 hover:underline inline-flex items-center justify-center gap-1.5 self-center mt-1"
                      disabled={isProcessing}
                    >
                      ← Quay lại cổng đăng nhập Google chính
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-[#442c38] tracking-tight mb-1">
                      Xác Minh Google Tối Cao ⟡
                    </h3>
                    <p className="text-xs text-pink-600 font-medium mb-4">
                      Ứng dụng riêng tư của Nguyễn Thị Thu Trang. Vợ vui lòng liên kết tài khoản Google đã ủy nhiệm để được cấp phép vào hệ thống.
                    </p>

                    {authError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold leading-relaxed">
                        ⚠️ {authError}
                      </div>
                    )}

                    {isProcessing ? (
                      <div className="flex flex-col items-center py-6 bg-pink-50/50 rounded-3xl border border-pink-100 mb-4 relative overflow-hidden">
                        {/* Hiệu ứng quét laser hồng */}
                        <motion.div 
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_12px_#ec4899]"
                        />
                        
                        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4 border border-pink-200 relative animate-pulse">
                          <span className="text-3xl">🧬</span>
                        </div>

                        <div className="w-full px-6 mb-3">
                          <div className="flex justify-between items-center text-xs font-bold text-pink-600 mb-1">
                            <span>Đang kiểm duyệt bảo mật...</span>
                            <span>{progressVal}%</span>
                          </div>
                          <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-100 rounded-full" 
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                        </div>

                        {/* Log quét hệ thống */}
                        <div className="w-full px-6 max-h-[140px] overflow-y-auto text-left flex flex-col gap-1.5 mt-2">
                          {authStepLogs.map((log, idx) => (
                            <div key={idx} className="text-[11px] font-mono font-medium text-pink-700 bg-pink-100/50 px-2 py-1 rounded-lg">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-4 pt-2">
                        <button 
                          onClick={handleGoogleVerify}
                          className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2.5 hover:shadow-lg hover:shadow-pink-500/20 active:scale-[0.98] transition-all"
                        >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.55-4.43 10.55-10.714 0-.72-.078-1.272-.172-1.714H12.24z"/>
                          </svg>
                          Đăng Nhập Bằng Google Account ⟡
                        </button>

                        <button 
                          onClick={() => {
                            setShowBypassChooser(true);
                            setAuthError("");
                          }}
                          className="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50/50 text-pink-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-pink-50 hover:border-pink-400 active:scale-[0.98] transition-all"
                        >
                          🌸 Cổng Đăng Nhập Một Chạm Dự Phòng (Bypass Secure)
                        </button>
                      </div>
                    )}

                    <div className="text-[10px] text-[#836d7a] text-center font-medium mt-1">
                      Chỉ duy nhất email <b className="text-pink-500">Thithutrangn28@gmail.com</b> có quyền năng mở khóa ứng dụng này.
                    </div>
                  </>
                )
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-[#442c38] tracking-tight mb-1">
                    Phát Hiện Thiết Bị Mới! 📱
                  </h3>
                  <p className="text-xs text-pink-600 font-medium mb-4">
                    Tài khoản Google của vợ yêu Trang vừa được xác nhận! Tuy nhiên thiết bị này chưa được liên kết.
                  </p>

                  <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 text-left text-xs space-y-2 mb-5 leading-relaxed text-[#523d49]">
                    <div className="flex items-center gap-2 text-pink-600 font-bold">
                      <span>⚠️ CẢNH BÁO DEVICE BINDING TỐI CAO:</span>
                    </div>
                    <p>
                      Mỗi thời điểm, ứng dụng chỉ cho phép duy nhất <b>MỘT thiết bị tin cậy</b> được quyền truy cập.
                    </p>
                    <p>
                      - Thiết bị cũ đã được liên kết: <b className="text-pink-600">{previousDeviceName}</b>
                    </p>
                    <p>
                      - Để kích hoạt thiết bị mới này, chồng cần <b>THU HỒI hoàn toàn quyền truy cập</b> của thiết bị cũ. Mọi phiên hoạt động cũ sẽ bị vô hiệu hóa lập tức để đảm bảo an toàn tuyệt đối.
                    </p>
                  </div>

                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold leading-relaxed">
                      ⚠️ {authError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        setIsBindingApprovalNeeded(false);
                        setAuthError("");
                      }}
                      className="min-h-[48px] rounded-2xl border border-pink-200 bg-pink-50 text-pink-600 font-bold text-sm"
                      disabled={isProcessing}
                    >
                      Hủy bỏ
                    </button>
                    
                    <button 
                      onClick={handleApproveNewDevice}
                      className="min-h-[48px] rounded-2xl bg-gradient-to-r from-red-400 to-red-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:shadow-lg active:scale-[0.98] transition-all"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Đang xử lý..." : "Đồng Ý & Liên Kết Máy Mới"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
