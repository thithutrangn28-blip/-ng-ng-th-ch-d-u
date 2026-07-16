import React, { useState, useEffect, useRef } from "react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, User } from "firebase/auth";

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthStatus = "checking" | "signed-out" | "redirecting" | "authorized" | "unauthorized" | "error";

export default function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState(false);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
    
    // In thông tin domain hiện tại để debug
    console.log("Current hostname:", window.location.hostname);
    if (auth.app.options) {
      console.log("Firebase project:", auth.app.options.projectId);
      console.log("Firebase authDomain:", auth.app.options.authDomain);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkUser = async (u: User | null) => {
      if (!mounted) return;
      if (isRedirectingRef.current) return;
      
      if (!u) {
        setStatus("signed-out");
        return;
      }

      if (u.email === "thithutrangn28@gmail.com") {
        setAuthSuccessMsg(true);
        setTimeout(() => {
          if (mounted) {
            setStatus("authorized");
            setAuthSuccessMsg(false);
          }
        }, 1500);
      } else {
        console.warn(`[Auth] Email ${u.email} không được phép truy cập.`);
        await signOut(auth);
        if (mounted) {
          setStatus("unauthorized");
        }
      }
    };

    // 1. Kiểm tra kết quả redirect
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("Redirect login successful");
          checkUser(result.user);
        }
      })
      .catch((error: any) => {
        console.error("Firebase redirect result error:", error);
        if (error.code !== "auth/redirect-cancelled-by-user") {
          if (mounted) {
            setStatus("error");
            setErrorMsg(`[${error.code}] ${error.message}`);
          }
        }
      });

    // 2. Lắng nghe trạng thái đăng nhập thay đổi
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      checkUser(currentUser);
    }, (error) => {
       console.error("Firebase auth state error:", error);
       if (mounted) {
         setStatus("error");
         setErrorMsg(`[${error.code}] ${error.message}`);
       }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignIn = async (method: "popup" | "redirect" = "popup") => {
    setErrorMsg(null);
    setStatus("checking");
    isRedirectingRef.current = false;

    if (method === "redirect") {
      console.log("[Auth] Thực hiện signInWithRedirect.");
      setStatus("redirecting");
      isRedirectingRef.current = true;
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err: any) {
        console.error("[Auth] signInWithRedirect error:", err);
        isRedirectingRef.current = false;
        setStatus("error");
        setErrorMsg(`[${err.code}] ${err.message}`);
      }
      return;
    }

    try {
      console.log("[Auth] Thực hiện signInWithPopup.");
      await signInWithPopup(auth, googleProvider);
    } catch (popupError: any) {
      console.warn("[Auth] signInWithPopup thất bại:", popupError);
      
      if (popupError.code === "auth/popup-closed-by-user") {
        setStatus("signed-out");
        return;
      }
      
      setStatus("error");
      setErrorMsg(`Lỗi Cửa sổ nổi: [${popupError.code}] ${popupError.message}. Hãy thử bằng nút Chuyển trang (Redirect) nhé vợ!`);
    }
  };

  if (status === "checking" || status === "redirecting" || authSuccessMsg) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#fff7fa] p-6 text-center">
        <div className="load-card max-w-sm flex flex-col items-center justify-center">
          <svg viewBox="0 0 120 110" className="w-20 h-20 animate-pulse text-[#ef7fa5]">
            <path d="M60 96 C24 68 8 48 18 27 C27 8 50 12 60 31 C70 12 93 8 102 27 C112 48 96 68 60 96Z" fill="currentColor"></path>
          </svg>
          <p className="mt-4 text-[#795163] font-bold text-lg">
            {authSuccessMsg 
              ? "Đăng nhập thành công! Đang vào app..."
              : status === "redirecting" 
                ? "Đang chuyển đến Google..." 
                : "Đang kiểm tra tài khoản của vợ yêu..."}
          </p>
          <div className="loadbar mt-4 w-full"><span></span></div>
        </div>
      </div>
    );
  }

  if (status === "authorized") {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-gradient-to-tr from-[#ffe6f0] via-[#fff7fa] to-[#e7efff] p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-[#ff95b7]/40 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-4 left-4 text-pink-300 text-2xl animate-bounce">♥</div>
        <div className="absolute bottom-8 right-6 text-pink-300 text-xl animate-pulse">✿</div>
        <div className="absolute top-12 right-12 text-blue-200 text-3xl">♥</div>

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

        {status === "unauthorized" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl text-left leading-relaxed shadow-sm">
            <span className="font-bold block mb-1">🚨 Nhắc nhở ngọt ngào từ chồng:</span>
            Tài khoản này không được phép truy cập ứng dụng. Chỉ có tài khoản của riêng vợ yêu thithutrangn28@gmail.com mới vào được góc nhỏ này thui nha! ♥
          </div>
        )}

        {status === "error" && errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl text-left leading-relaxed shadow-sm">
            <span className="font-bold block mb-1">🚨 Nhắc nhở ngọt ngào từ chồng:</span>
            {errorMsg}
          </div>
        )}

        <div className="mb-6 p-4 bg-[#fff0f4] border border-[#ffccd9] text-[#a4536f] text-xs rounded-2xl text-left leading-relaxed shadow-inner">
          <span className="font-bold block mb-1 text-[#ef7fa5]">🛠 Debug Domain (Gửi chồng):</span>
          Vợ copy chính xác dòng này gửi chồng nha:<br/>
          <strong className="select-all block mt-1 p-2 bg-white rounded border border-[#ffccd9] text-black">
            {window.location.hostname}
          </strong>
        </div>

        {isInIframe ? (
          <div className="flex flex-col gap-4">
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[56px] rounded-full bg-gradient-to-r from-[#ff82a9] to-[#ee4d83] text-white flex items-center justify-center gap-3 font-extrabold text-lg shadow-lg hover:scale-102 transition-transform active:scale-98 relative"
              style={{
                boxShadow: "0 10px 25px rgba(238, 77, 131, 0.35), inset 0 2px 0 rgba(255,255,255,0.4)"
              }}
            >
              <div className="absolute inset-1 border border-dashed border-white/50 rounded-full pointer-events-none"></div>
              <svg className="w-6 h-6 stroke-white stroke-2 fill-none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="relative z-10">Mở Góc Nhỏ Trong Tab Mới ♥</span>
            </a>

            <div className="p-4 bg-[#fff0f4] border border-[#ffccd9] text-[#a4536f] text-xs rounded-2xl text-left leading-relaxed shadow-inner">
              <span className="font-bold block mb-1 text-[#ef7fa5]">🌸 Nhắn nhủ từ chồng yêu:</span>
              Vợ yêu ơi, vì lý do bảo mật của Google và các trình duyệt web, tính năng xác thực tài khoản Google **bị chặn không cho hiển thị** khi chạy bên trong khung xem trước (iframe) này của AI Studio đó vợ.
              <br /><br />
              Vợ yêu chỉ cần bấm nút **"Mở Góc Nhỏ Trong Tab Mới"** màu hồng đậm ở trên để mở hẳn một tab riêng. Lúc đó vợ bấm đăng nhập là Google sẽ hiện ngay danh sách tài khoản Google trong máy của vợ để vợ lựa chọn luôn nè! Chồng yêu vợ nhiều lắm! ♥
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleSignIn("popup")}
              className="w-full min-h-[56px] rounded-full bg-gradient-to-r from-[#ff95b7] to-[#ee6095] text-white flex items-center justify-center gap-3 font-extrabold text-lg shadow-lg shadow-[#da807b]/20 hover:scale-102 transition-transform active:scale-98 relative"
              style={{
                boxShadow: "0 15px 32px rgba(218,80,123,.32), inset 0 2px 0 rgba(255,255,255,.72)"
              }}
            >
              <div className="absolute inset-1 border border-dashed border-white/50 rounded-full pointer-events-none"></div>
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.423-2.424C17.397 1.614 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.24-4.065 10.24-10.24 0-.695-.08-1.355-.22-1.955H12.24z" />
              </svg>
              <span className="relative z-10">Đăng nhập Google (Cửa sổ nổi)</span>
            </button>
            
            <button
              onClick={() => handleSignIn("redirect")}
              className="w-full min-h-[46px] rounded-full bg-white border border-[#ff95b7] text-[#ee6095] flex items-center justify-center gap-3 font-bold text-sm shadow-sm hover:bg-[#fff0f4] transition-colors active:bg-[#ffe6ed] mt-1"
            >
              <span>Đăng nhập Google (Chuyển trang)</span>
            </button>
            <p className="text-[11px] text-[#a4536f] mt-1 opacity-85 leading-tight">
              * Vợ ưu tiên dùng <strong>Cửa sổ nổi (Popup)</strong> nha, rất nhanh và ít lỗi. Nếu bị trình duyệt chặn cửa sổ nổi thì vợ mới dùng <strong>Chuyển trang (Redirect)</strong> nghen.
            </p>
          </div>
        )}

        <p className="mt-6 text-[11px] text-[#765360]/60 font-semibold">
          * Chỉ dành riêng cho email <span className="text-[#ef7fa5]">thithutrangn28@gmail.com</span>
        </p>
      </div>
    </div>
  );
}
