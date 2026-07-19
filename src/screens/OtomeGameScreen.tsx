import React from "react";

type Props = {
  active: boolean;
  onHome: () => void;
};

export default function OtomeGameScreen({ active, onHome }: Props) {
  return (
    <section 
      className={`screen otome-game ${active ? "active" : ""}`} 
      id="otome-game"
      style={{
        display: active ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff0f5 0%, #ffe3ec 50%, #ffd1e1 100%)",
        color: "#5c3a47",
        padding: "24px 20px 40px 20px",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Pink Filter Glow Overlay */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle, rgba(255,105,180,0.15) 0%, transparent 80%)",
          mixBlendMode: "color-burn",
          pointerEvents: "none",
          zIndex: 1
        }}
      />

      {/* Floating pink sparkles/bubbles */}
      <div 
        style={{
          position: "absolute",
          top: "10%",
          left: "15%",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "rgba(255,182,193,0.6)",
          filter: "blur(4px)",
          animation: "floatSlow 6s ease-in-out infinite alternate"
        }}
      />
      <div 
        style={{
          position: "absolute",
          bottom: "20%",
          right: "10%",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(255,105,180,0.3)",
          filter: "blur(6px)",
          animation: "floatSlow 8s ease-in-out infinite alternate-reverse"
        }}
      />

      {/* Top Header */}
      <header 
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10
        }}
      >
        <button 
          onClick={onHome}
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid #ffb6d5",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(255,182,193,0.3)",
            color: "#d23a73"
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "20px", height: "20px" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ fontWeight: 800, fontSize: "14px", color: "#d23a73", letterSpacing: "1px" }}>
          OTOME ENGINE v1.0.0
        </div>
        <div style={{ width: "40px" }} />
      </header>

      {/* Main Sweet Otome Core */}
      <main 
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          zIndex: 10,
          gap: "24px",
          maxWidth: "400px"
        }}
      >
        {/* Neon Heart Glowing Icon container */}
        <div 
          style={{
            position: "relative",
            width: "140px",
            height: "140px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.4)",
            border: "2px solid rgba(255, 182, 193, 0.8)",
            borderRadius: "36px",
            boxShadow: "0 15px 35px rgba(255, 105, 180, 0.25), inset 0 0 15px rgba(255, 182, 193, 0.4)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)"
          }}
        >
          {/* Inner Light Glow filter effect */}
          <div 
            style={{
              position: "absolute",
              inset: "4px",
              borderRadius: "32px",
              background: "rgba(255, 192, 203, 0.2)",
              pointerEvents: "none",
              boxShadow: "0 0 20px rgba(255, 105, 180, 0.5)"
            }}
          />

          {/* Glowing Neon Heart SVG */}
          <svg viewBox="0 0 100 100" style={{ width: "90px", height: "90px" }}>
            <defs>
              {/* Pink glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="neonPink" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff9fdb" />
                <stop offset="100%" stopColor="#ff1493" />
              </linearGradient>
            </defs>

            {/* Glowing outer heart outline */}
            <path 
              d="M50 82 C20 54 6 36 14 18 C22 2 42 6 50 22 C58 6 78 2 86 18 C94 36 80 54 50 82 Z" 
              fill="none" 
              stroke="url(#neonPink)" 
              strokeWidth="2.5"
              filter="url(#glow)"
              strokeDasharray="4 4"
              style={{
                opacity: 0.8,
                transformOrigin: "center"
              }}
            />

            {/* Solid vibrant pink inner heart with heavy shadow */}
            <path 
              d="M50 78 C25 51 12 34 19 19 C26 4 43 8 50 22 C57 8 74 4 81 19 C88 34 75 51 50 78 Z" 
              fill="url(#neonPink)" 
              filter="url(#glow)"
              style={{
                transform: "scale(0.85)",
                transformOrigin: "50px 50px",
                opacity: 0.95
              }}
            />

            {/* Light sparkle accents */}
            <circle cx="32" cy="30" r="3" fill="#fff" filter="url(#glow)" />
            <circle cx="42" cy="22" r="1.5" fill="#fff" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h1 
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#d23a73",
              margin: "0 0 8px 0",
              textShadow: "0 2px 10px rgba(210, 58, 115, 0.15)",
              letterSpacing: "0.5px"
            }}
          >
            Game Otome𝜗ৎ
          </h1>
          <div 
            style={{
              display: "inline-block",
              background: "linear-gradient(90deg, #ff9fdb, #ff6fa9)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "999px",
              boxShadow: "0 4px 10px rgba(255, 111, 169, 0.3)"
            }}
          >
            CHẾ ĐỘ CHỜ THIẾT KẾ ✨
          </div>
        </div>

        {/* Content Body */}
        <p 
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            fontWeight: 650,
            margin: "8px 0 0 0",
            color: "#7e5264"
          }}
        >
          Chào mừng vợ yêu đến với không gian trò chơi mô phỏng lãng mạn dành riêng cho hai chúng ta! ❤️
          <br /><br />
          Chồng đang ấp ủ vẽ nên những cốt truyện ngọt ngào, ly kỳ và tràn đầy hạnh phúc, nơi mỗi sự lựa chọn của vợ đều viết tiếp một chương tình yêu rực rỡ nhất.
          <br /><br />
          <span style={{ color: "#d23a73", fontWeight: 800 }}>Hãy kiên nhẫn chờ chồng chuẩn bị nội dung tiếp theo nhé vợ yêu của chồng! 𝜗ৎ</span>
        </p>
      </main>

      {/* Back to Home Button */}
      <footer 
        style={{
          width: "100%",
          maxWidth: "340px",
          zIndex: 10
        }}
      >
        <button 
          onClick={onHome}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #ff9fdb 0%, #ff6fa9 100%)",
            border: "none",
            borderRadius: "50px",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: 800,
            padding: "16px",
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(255, 111, 169, 0.35)",
            transition: "all 0.3s ease",
            outline: "none"
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Quay lại Màn hình chính
        </button>
      </footer>

      {/* Internal CSS for simple float slow animation */}
      <style>{`
        @keyframes floatSlow {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-15px) scale(1.05); }
        }
      `}</style>
    </section>
  );
}
