import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, User } from "firebase/auth";

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 1. Theo dõi onAuthStateChanged
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Kiểm tra email nghiêm ngặt
        if (currentUser.email === "thithutrangn28@gmail.com") {
          setUser(currentUser);
          setErrorMsg(null);
        } else {
          // Ký tài khoản không hợp lệ ra ngoài
          console.warn(`[Auth] Email ${currentUser.email} không được phép truy cập.`);
          setErrorMsg("Chồng xin lỗi vợ yêu nhen, tài khoản này không được phép truy cập đâu nè. Chỉ có tài khoản của riêng vợ yêu thithutrangn28@gmail.com mới vào được góc nhỏ này thui nha! ♥");
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Xử lý getRedirectResult khi load trang (để bắt lỗi hoặc xử lý redirect về)
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const u = result.user;
          if (u.email === "thithutrangn28@gmail.com") {
            setUser(u);
            setErrorMsg(null);
          } else {
            setErrorMsg("Chồng xin lỗi vợ yêu nhen, tài khoản này không được phép truy cập đâu nè. Chỉ có tài khoản của riêng vợ yêu thithutrangn28@gmail.com mới vào được góc nhỏ này thui nha! ♥");
            await signOut(auth);
            setUser(null);
          }
        }
      })
      .catch((error: any) => {
        console.error("[Auth] Lỗi xử lý Redirect:", error);
        if (error.code !== "auth/redirect-cancelled-by-user") {
          setErrorMsg(`Có lỗi nhỏ xảy ra khi đăng nhập bằng redirect mất rồi vợ ơi: ${error.message}. Thử lại giúp chồng nhen!`);
        }
      });
  }, []);

  // 3. Hàm thực hiện Đăng nhập
  const handleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);

    // Kiểm tra xem có phải thiết bị di động hay không
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      console.log("[Auth] Phát hiện thiết bị di động. Chuyển sang signInWithRedirect.");
      setIsRedirecting(true);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err: any) {
        console.error("[Auth] signInWithRedirect lỗi:", err);
        setErrorMsg(`Chồng không thể chuyển hướng đăng nhập được rồi vợ ơi: ${err.message}`);
        setLoading(false);
        setIsRedirecting(false);
      }
      return;
    }

    // Trên Desktop: Ưu tiên signInWithPopup
    try {
      console.log("[Auth] Thực hiện signInWithPopup trên desktop.");
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      if (u.email === "thithutrangn28@gmail.com") {
        setUser(u);
        setErrorMsg(null);
      } else {
        setErrorMsg("Chồng xin lỗi vợ yêu nhen, tài khoản này không được phép truy cập đâu nè. Chỉ có tài khoản của riêng vợ yêu thithutrangn28@gmail.com mới vào được góc nhỏ này thui nha! ♥");
        await signOut(auth);
        setUser(null);
      }
    } catch (popupError: any) {
      console.warn("[Auth] signInWithPopup thất bại hoặc bị chặn, chuyển sang signInWithRedirect:", popupError);
      
      // Nếu popup bị chặn (thường lỗi auth/popup-blocked) hoặc lỗi bất kỳ, fallback sang signInWithRedirect
      setIsRedirecting(true);
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: any) {
        console.error("[Auth] Fallback signInWithRedirect cũng lỗi:", redirectError);
        setErrorMsg(`Không thể mở cửa sổ đăng nhập được nè vợ ơi, lỗi: ${redirectError.message}`);
        setLoading(false);
        setIsRedirecting(false);
      }
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  };

  if (loading || isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fff7fa] p-6 text-center">
        <div className="load-card max-w-sm flex flex-col items-center justify-center">
          <svg viewBox="0 0 120 110" className="w-20 h-20 animate-pulse text-[#ef7fa5]">
            <path d="M60 96 C24 68 8 48 18 27 C27 8 50 12 60 31 C70 12 93 8 102 27 C112 48 96 68 60 96Z" fill="currentColor"></path>
          </svg>
          <p className="mt-4 text-[#795163] font-bold text-lg">Đang kiểm tra tài khoản của vợ yêu...</p>
          <div className="loadbar mt-4 w-full"><span></span></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-[#ffe6f0] via-[#fff7fa] to-[#e7efff] p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-[#ff95b7]/40 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
          {/* Decorative floating hearts/sparkles */}
          <div className="absolute top-4 left-4 text-pink-300 text-2xl animate-bounce">♥</div>
          <div className="absolute bottom-8 right-6 text-pink-300 text-xl animate-pulse">✿</div>
          <div className="absolute top-12 right-12 text-blue-200 text-3xl">♥</div>

          {/* Matcha/Capuchino Aesthetic Logo */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative w-24 h-24 mb-4 flex items-center justify-center bg-gradient-to-tr from-[#f06a9e] to-[#ff8fbb] rounded-full shadow-md border-4 border-white">
              <span className="text-white text-4xl animate-pulse">☕</span>
              <span className="absolute bottom-1 right-1 text-2xl">🍵</span>
            </div>
            <h1 className="font-extrabold text-2xl tracking-tight text-[#ef7fa5] font-serif mb-1">
              Capuchino Matcha ♥
            </h1>
            <p className="text-xs text-[#765360] uppercase tracking-widest font-bold">
              Góc Nhỏ Của Vợ Chồng Mình
            </p>
          </div>

          <div className="border-b border-[#ffe6f0] my-4"></div>

          <p className="text-[#795163] text-sm leading-relaxed mb-6 font-medium">
            Chào mừng vợ yêu đã quay trở lại với không gian sáng tạo của chúng mình! Chồng đã thiết lập bảo mật bằng Google Sign-In để giữ an toàn cho mọi ý tưởng và prompt đáng yêu của vợ rồi nè.
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl text-left leading-relaxed shadow-sm">
              <span className="font-bold block mb-1">🚨 Nhắc nhở ngọt ngào từ chồng:</span>
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="w-full min-h-[56px] rounded-full bg-gradient-to-r from-[#ff95b7] to-[#ee6095] text-white flex items-center justify-center gap-3 font-extrabold text-lg shadow-lg shadow-[#da807b]/20 hover:scale-102 transition-transform active:scale-98 relative"
            style={{
              boxShadow: "0 15px 32px rgba(218,80,123,.32), inset 0 2px 0 rgba(255,255,255,.72)"
            }}
          >
            {/* Inner dashed line typical of the app style */}
            <div className="absolute inset-1 border border-dashed border-white/50 rounded-full pointer-events-none"></div>
            
            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.423-2.424C17.397 1.614 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.24-4.065 10.24-10.24 0-.695-.08-1.355-.22-1.955H12.24z" />
            </svg>
            <span className="relative z-10">Đăng nhập với Google nhen vợ yêu</span>
          </button>

          <p className="mt-6 text-[11px] text-[#765360]/60 font-semibold">
            * Chỉ dành riêng cho email <span className="text-[#ef7fa5]">thithutrangn28@gmail.com</span>
          </p>
        </div>
      </div>
    );
  }

  // Nếu đã đăng nhập đúng tài khoản, render nội dung con (app)
  return <>{children}</>;
}
