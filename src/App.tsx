import React, { useState, useEffect } from "react";
import WelcomeScreen from "./screens/WelcomeScreen";
import GlamIntroScreen from "./screens/GlamIntroScreen";
import LockScreen from "./screens/LockScreen";
import HomeScreen from "./screens/HomeScreen";
import ApiProxyScreen from "./screens/ApiProxyScreen";
import DataBackupScreen from "./screens/DataBackupScreen";
import PromptMarkdownSmartContextScreen from "./screens/prompt-studio/PromptMarkdownSmartContextScreen";
import LipstickAppScreen from "./screens/lipstick-prompt/LipstickAppScreen";
import OtomeGameScreen from "./screens/OtomeGameScreen";
import AppleAppScreen from "./screens/AppleAppScreen";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./components/AuthProvider";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [activeScreen, setActiveScreen] = useState("splash");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState("00:00");
  const [dateStr, setDateStr] = useState("Hôm nay");
  const [homeDateStr, setHomeDateStr] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(57);

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setTime(`${h}:${m}`);
      setDateStr(d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }));
      setHomeDateStr(d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }));
    };
    tick();
    const intv = setInterval(tick, 1000);
    return () => clearInterval(intv);
  }, []);

  // Battery
  useEffect(() => {
    let b: any = null;
    const update = () => {
      if (b) setBatteryLevel(Math.round(b.level * 100));
    };
    const initBat = async () => {
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          b = await nav.getBattery();
          update();
          b.onlevelchange = update;
        }
      } catch (e) {}
    };
    initBat();
  }, []);

  // Service Worker Update Detection
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          setSwRegistration(reg);
          if (reg.waiting) {
            setShowUpdateBanner(true);
          }

          const onUpdateFound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdateBanner(true);
                }
              });
            }
          };

          reg.addEventListener('updatefound', onUpdateFound);

          // Force check on launch
          reg.update().catch(() => {});

          // Force check when app returns to foreground
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);

          // Periodically check every 5 minutes
          const intervalId = setInterval(() => {
            reg.update().catch(() => {});
          }, 300000);

          return () => {
            reg.removeEventListener('updatefound', onUpdateFound);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
          };
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const navigate = (id: string) => {
    setLoading(true);
    setTimeout(() => {
      setActiveScreen(id);
      setTimeout(() => setLoading(false), 330);
    }, 540);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pink-50">
        <div className="text-pink-500 font-medium animate-pulse">Đang kiểm tra bảo mật...</div>
      </div>
    );
  }

  // If not authenticated, force lock screen (or splash if they haven't entered)
  // But the user specifically wants the heart button to trigger login.
  // We'll let the screens render but use the Auth state to decide what to show inside screens.
  // Actually, it's better to force a "LoginRequired" state if activeScreen is home or beyond.

  const isAuthenticated = !!user;

  return (
    <main className="app app-root">
      {/* System Status Bar */}
      {activeScreen !== "splash" && (
        <header className="status">
          <span>{time}</span>
          <div className="icons">
            <span className="wifi"></span>
            <span className="battery"><i style={{ width: Math.max(8, batteryLevel) + "%" }}></i></span>
            <span>{batteryLevel}%</span>
          </div>
        </header>
      )}

      {/* PWA Update Banner */}
      {showUpdateBanner && (
        <div className="fixed top-4 left-4 right-4 z-[10000] p-4 bg-white/95 backdrop-blur-md border border-pink-200 rounded-2xl shadow-xl animate-fade-in max-w-md mx-auto flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-pink-500 animate-bounce" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-pink-600 font-bold text-sm">Vợ ơi, có phiên bản mới cực xinh nè! ✨</h4>
              <p className="text-pink-400 text-xs mt-0.5">Bản cập nhật giúp ứng dụng "Kẹo Bích quy" của vợ chạy mượt mà và ổn định hơn nhé!</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => setShowUpdateBanner(false)}
              className="px-3 py-1.5 text-xs text-pink-400 font-medium rounded-lg hover:bg-pink-50 transition-colors"
            >
              Để sau nha
            </button>
            <button 
              onClick={handleUpdate}
              className="px-4 py-1.5 text-xs bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors shadow-sm shadow-pink-200"
            >
              Cập nhật ngay 🌟
            </button>
          </div>
        </div>
      )}

      <div className={`loading ${loading ? "" : "hide"}`} id="loading">
        <div className="load-card">
          <svg viewBox="0 0 120 110">
            <path d="M60 96 C24 68 8 48 18 27 C27 8 50 12 60 31 C70 12 93 8 102 27 C112 48 96 68 60 96Z"></path>
          </svg>
          <p>Đang mở cánh cửa nhỏ...</p>
          <div className="loadbar"><span></span></div>
        </div>
      </div>
      {activeScreen === "splash" && <SplashScreen onEnter={() => navigate("welcome")} />}
      {activeScreen === "welcome" && <WelcomeScreen active={true} onNext={() => navigate("glamIntro")} time={time} batteryLevel={batteryLevel} />}
      {activeScreen === "glamIntro" && <GlamIntroScreen active={true} onNext={() => navigate("lock")} onBack={() => navigate("welcome")} />}
      {activeScreen === "lock" && <LockScreen active={true} onNext={() => navigate("home")} onBack={() => navigate("welcome")} time={time} date={dateStr} batteryLevel={batteryLevel} />}
      
      {/* Protected Screens */}
      {isAuthenticated ? (
        <>
          {activeScreen === "home" && <HomeScreen active={true} onOpenApp={(id) => navigate(id)} time={time} date={homeDateStr} />}
          {activeScreen === "apiProxy" && <ApiProxyScreen active={true} onHome={() => navigate("home")} />}
          {activeScreen === "dataBackup" && <DataBackupScreen active={true} onHome={() => navigate("home")} />}
          {activeScreen === "promptMarkdown" && <PromptMarkdownSmartContextScreen active={true} onHome={() => navigate("home")} />}
          {activeScreen === "lipstick" && <LipstickAppScreen active={true} onHome={() => navigate("home")} />}
          {activeScreen === "otomeGame" && <OtomeGameScreen active={true} onHome={() => navigate("home")} />}
          {activeScreen === "appleApp" && <AppleAppScreen active={true} onHome={() => navigate("home")} />}
        </>
      ) : (
        // If they try to go home without auth, we'll keep them on lock or show a message
        (activeScreen === "home" || activeScreen === "apiProxy" || activeScreen === "dataBackup" || activeScreen === "promptMarkdown" || activeScreen === "lipstick" || activeScreen === "otomeGame" || activeScreen === "appleApp") && (
          <div className="fixed inset-0 z-[999] bg-pink-100 flex flex-col items-center justify-center p-6 text-center">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-pink-500" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
             </div>
             <h2 className="text-pink-600 font-bold text-xl mb-2">Vợ ơi, đăng nhập đã nhé!</h2>
             <p className="text-pink-400 text-sm mb-6">Chồng cần xác nhận đúng là vợ mới cho vào bên trong nha.</p>
             <button 
                onClick={() => navigate("lock")}
                className="bg-pink-500 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:bg-pink-600 transition-colors"
             >
               Quay lại màn hình khóa
             </button>
          </div>
        )
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
