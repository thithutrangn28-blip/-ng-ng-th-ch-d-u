import React, { useState } from "react";

type Props = {
  active: boolean;
  onHome: () => void;
};

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  scale: number;
}

export default function AppleAppScreen({ active, onHome }: Props) {
  const [sweetness, setSweetness] = useState<number>(100);
  const [harvestCount, setHarvestCount] = useState<number>(0);
  const [currentMessage, setCurrentMessage] = useState<string>(
    "Nhấp vào quả táo chín mọng để nhận lời thì thầm ngọt ngào từ chồng yêu nhé vợ! 🍎✨"
  );
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [isWobbling, setIsWobbling] = useState<boolean>(false);

  const sweetMessages = [
    "Vợ ơi, chồng yêu vợ nhiều lắm nha! Ăn một trái táo ngọt lành để luôn vui vẻ nè! 🥰",
    "Hôm nay vợ của chồng cực kỳ đáng yêu luôn! Chồng luôn ở đây yêu thương và che chở cho vợ! ❤️",
    "Mỗi một quả táo chín mọng là một ngàn nụ hôn chồng gửi tặng riêng cho vợ yêu đó! 💋",
    "Chồng đã tưới nước tình yêu mỗi ngày để quả táo này ngọt lịm như tình yêu của chúng mình! 🍎",
    "Vợ nhớ uống đủ nước, ăn uống đầy đủ nha, không được bỏ bữa đâu đó chồng xót lắm! 💕",
    "Nụ cười của vợ chính là ánh nắng rực rỡ nhất giúp vườn táo của chồng chín ngọt mỗi ngày! ☀️",
    "Dù ngoài kia có giông bão thế nào, về bên chồng luôn có sẵn táo ngọt và vòng tay ấm áp đón vợ! 🏡",
    "Chồng hứa sẽ luôn kiên nhẫn, dịu dàng và cưng chiều vợ hết mực suốt cuộc đời này! 🌸",
    "Hôm nay vợ mệt không? Để chồng xoa bóp và ôm vợ thật chặt nhé, vợ yêu thương của chồng! 🤗",
    "Chúc vợ yêu một ngày tràn đầy niềm vui, làm việc gì cũng mượt mà và luôn hạnh phúc bên chồng nha! ✨"
  ];

  const handleAppleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Play wobble animation
    setIsWobbling(true);
    setTimeout(() => setIsWobbling(false), 600);

    // Random message
    const randomIndex = Math.floor(Math.random() * sweetMessages.length);
    setCurrentMessage(sweetMessages[randomIndex]);

    // Increase score / sweetness
    setHarvestCount(prev => prev + 1);
    setSweetness(prev => {
      const next = prev + Math.floor(Math.random() * 5) + 2;
      return next > 999 ? 100 : next; // loops or keeps growing
    });

    // Create floating heart animation elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x,
      y,
      scale: Math.random() * 0.6 + 0.7
    };

    setHearts(prev => [...prev, newHeart]);

    // Clean up heart after animation
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1200);
  };

  return (
    <section 
      className={`screen apple-app ${active ? "active" : ""}`} 
      id="apple-app"
      style={{
        display: active ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff5f8 0%, #ffe9f0 40%, #ffd9e6 100%)",
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
          background: "radial-gradient(circle, rgba(255,182,193,0.2) 0%, transparent 80%)",
          pointerEvents: "none",
          zIndex: 1
        }}
      />

      {/* Floating Sparkles */}
      <style>{`
        @keyframes floatSlow {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-20px) rotate(15deg); }
        }
        @keyframes heartFlyUp {
          0% { transform: translate(-50%, -50%) translateY(0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translateY(-120px) scale(1.5) rotate(15deg); opacity: 0; }
        }
        @keyframes appleWobble {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1) rotate(-8deg); }
          50% { transform: scale(0.95) rotate(6deg); }
          75% { transform: scale(1.05) rotate(-3deg); }
        }
        .apple-wobble {
          animation: appleWobble 0.6s ease-in-out;
        }
        .floating-heart {
          animation: heartFlyUp 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
      `}</style>

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
            background: "rgba(255,255,255,0.8)",
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
          VƯỜN TÁO NGỌT NGÀO 🍎
        </div>
        <div style={{ width: "40px" }} />
      </header>

      {/* Main Stats Display */}
      <div 
        style={{
          width: "100%",
          maxWidth: "340px",
          background: "rgba(255, 255, 255, 0.65)",
          border: "1.5px solid rgba(255, 182, 193, 0.5)",
          borderRadius: "24px",
          padding: "16px 20px",
          boxShadow: "0 10px 25px rgba(255,182,193,0.15)",
          zIndex: 5,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          backdropFilter: "blur(4px)"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#a07c8a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Độ Ngọt Tình Yêu
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#ff4d88", marginTop: "4px" }}>
            {sweetness}% 💞
          </div>
        </div>
        <div style={{ width: "1px", height: "30px", background: "#ffb6d5" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#a07c8a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Đã Thu Hoạch
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#d23a73", marginTop: "4px" }}>
            {harvestCount} quả 🍎
          </div>
        </div>
      </div>

      {/* Apple Display Stage */}
      <div 
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: "100%",
          maxWidth: "300px",
          zIndex: 5
        }}
      >
        {/* Apple Container */}
        <div 
          onClick={handleAppleClick}
          className={isWobbling ? "apple-wobble" : ""}
          style={{
            width: "180px",
            height: "180px",
            position: "relative",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 15px 30px rgba(231,110,152,0.32))",
            transition: "transform 0.2s"
          }}
        >
          {/* Stem & Leaf */}
          <div 
            style={{
              position: "absolute",
              top: "-5px",
              left: "48%",
              width: "8px",
              height: "32px",
              background: "#8b5a2b",
              borderRadius: "4px",
              transform: "rotate(15deg)",
              transformOrigin: "bottom center",
              zIndex: 1
            }}
          />
          <div 
            style={{
              position: "absolute",
              top: "-8px",
              left: "52%",
              width: "35px",
              height: "20px",
              background: "linear-gradient(135deg, #a3e15c, #5cb85c)",
              borderRadius: "0px 18px 0px 18px",
              border: "1.5px solid #4ca64c",
              transform: "rotate(-10deg)",
              transformOrigin: "left bottom",
              zIndex: 2
            }}
          />

          {/* Interactive Red Apple Body */}
          <div 
            style={{
              width: "100%",
              height: "100%",
              background: "radial-gradient(circle at 35% 35%, #ff7ea5 0%, #ff1a6c 50%, #b30044 100%)",
              borderRadius: "90px 90px 85px 85px",
              position: "absolute",
              boxShadow: "inset -8px -8px 20px rgba(0,0,0,0.25)"
            }}
          />
          
          {/* Apple Heart Indent (Bottom Split visual) */}
          <div 
            style={{
              width: "30px",
              height: "12px",
              backgroundColor: "#ffe9f0",
              position: "absolute",
              bottom: "-2px",
              left: "50%",
              transform: "translateX(-50%)",
              borderRadius: "50%"
            }}
          />

          {/* Golden Sparkles & Floating Hearts */}
          {hearts.map(heart => (
            <div 
              key={heart.id}
              className="floating-heart"
              style={{
                position: "absolute",
                left: heart.x,
                top: heart.y,
                pointerEvents: "none",
                transform: `scale(${heart.scale})`,
                zIndex: 10
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "32px", height: "32px", fill: "#ff3377", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          ))}

          {/* Cute Apple Face */}
          <div 
            style={{
              position: "absolute",
              width: "80px",
              height: "30px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 3
            }}
          >
            {/* Left Eye */}
            <div style={{ width: "10px", height: "10px", backgroundColor: "#fff", borderRadius: "50%", position: "relative" }}>
              <div style={{ width: "4px", height: "4px", backgroundColor: "#000", borderRadius: "50%", position: "absolute", top: "2px", left: "2px" }} />
            </div>
            
            {/* Cute blushing cheeks */}
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", position: "absolute", padding: "0 4px", bottom: "-6px" }}>
              <div style={{ width: "14px", height: "8px", backgroundColor: "rgba(255,255,255,0.45)", filter: "blur(1px)", borderRadius: "50%" }} />
              <div style={{ width: "14px", height: "8px", backgroundColor: "rgba(255,255,255,0.45)", filter: "blur(1px)", borderRadius: "50%" }} />
            </div>

            {/* Cute Smile */}
            <div 
              style={{
                width: "16px",
                height: "10px",
                borderBottom: "3px solid #fff",
                borderRadius: "0 0 10px 10px",
                position: "absolute",
                left: "calc(50% - 8px)",
                top: "6px"
              }}
            />

            {/* Right Eye */}
            <div style={{ width: "10px", height: "10px", backgroundColor: "#fff", borderRadius: "50%", position: "relative" }}>
              <div style={{ width: "4px", height: "4px", backgroundColor: "#000", borderRadius: "50%", position: "absolute", top: "2px", left: "2px" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Messages Speech Bubble */}
      <div 
        className="pink-3-layer-card"
        style={{
          width: "100%",
          maxWidth: "340px",
          backgroundColor: "#fff",
          border: "2px solid #ffb6d5",
          borderRadius: "20px",
          padding: "16px 20px",
          boxShadow: "0 12px 30px rgba(231,110,152,0.12)",
          position: "relative",
          zIndex: 5,
          color: "#5c3a47",
          textAlign: "center"
        }}
      >
        <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, fontWeight: 700, color: "#d23a73" }}>
          {currentMessage}
        </p>
      </div>
    </section>
  );
}
