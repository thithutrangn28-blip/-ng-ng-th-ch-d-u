import React, { useState, useEffect } from "react";
import WelcomeScreen from "./screens/WelcomeScreen";
import GlamIntroScreen from "./screens/GlamIntroScreen";
import LockScreen from "./screens/LockScreen";
import HomeScreen from "./screens/HomeScreen";
import ApiProxyScreen from "./screens/ApiProxyScreen";

export default function App() {
  const [activeScreen, setActiveScreen] = useState("welcome");
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

  const navigate = (id: string) => {
    setLoading(true);
    setTimeout(() => {
      setActiveScreen(id);
      setTimeout(() => setLoading(false), 330);
    }, 540);
  };

  return (
    <main className="app">
      <div className={`loading ${loading ? "" : "hide"}`} id="loading">
        <div className="load-card">
          <svg viewBox="0 0 120 110">
            <path d="M60 96 C24 68 8 48 18 27 C27 8 50 12 60 31 C70 12 93 8 102 27 C112 48 96 68 60 96Z"></path>
          </svg>
          <p>Đang mở cánh cửa nhỏ...</p>
          <div className="loadbar"><span></span></div>
        </div>
      </div>

      <WelcomeScreen active={activeScreen === "welcome"} onNext={() => navigate("glamIntro")} time={time} batteryLevel={batteryLevel} />
      <GlamIntroScreen active={activeScreen === "glamIntro"} onNext={() => navigate("lock")} onBack={() => navigate("welcome")} />
      <LockScreen active={activeScreen === "lock"} onNext={() => navigate("home")} onBack={() => navigate("glamIntro")} time={time} date={dateStr} batteryLevel={batteryLevel} />
      <HomeScreen active={activeScreen === "home"} onOpenApp={(id) => navigate(id)} time={time} date={homeDateStr} />
      <ApiProxyScreen active={activeScreen === "apiProxy"} onHome={() => navigate("home")} />
    </main>
  );
}
