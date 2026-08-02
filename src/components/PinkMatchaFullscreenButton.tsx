import React, { useEffect, useRef } from "react";

export async function enterAppFullscreen() {
  if (typeof (window as any).enterTrueFullscreen === "function") {
    await (window as any).enterTrueFullscreen();
    return true;
  }

  const root = document.documentElement;
  root.style.setProperty("--app-height", `${window.innerHeight}px`);

  const fullscreenElement =
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement;

  if (fullscreenElement) {
    return true;
  }

  const requestFullscreen =
    root.requestFullscreen ||
    (root as any).webkitRequestFullscreen;

  if (!requestFullscreen) {
    return false;
  }

  try {
    const result = requestFullscreen.call(root, {
      navigationUI: "hide"
    });

    if (result && typeof result.then === "function") {
      await result;
    }

    return true;
  } catch (firstError) {
    try {
      const fallbackResult = requestFullscreen.call(root);

      if (
        fallbackResult &&
        typeof fallbackResult.then === "function"
      ) {
        await fallbackResult;
      }

      return true;
    } catch (fallbackError) {
      console.info(
        "Thiết bị đang dùng chế độ hiển thị do PWA quản lý."
      );
      return false;
    }
  }
}

export function sprayPinkScreen(sourceElement: HTMLElement | null) {
  const splash = document.getElementById("pinkMatchaSplash");
  if (!splash || !sourceElement) {
    return;
  }

  const rect = sourceElement.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const farthestX = Math.max(
    centerX,
    window.innerWidth - centerX
  );

  const farthestY = Math.max(
    centerY,
    window.innerHeight - centerY
  );

  const radius = Math.hypot(farthestX, farthestY) + 60;

  splash.style.setProperty("--splash-x", `${centerX}px`);
  splash.style.setProperty("--splash-y", `${centerY}px`);
  splash.style.setProperty("--splash-radius", `${radius}px`);

  splash.classList.remove("is-spraying");

  void splash.offsetWidth;

  splash.classList.add("is-spraying");

  window.setTimeout(() => {
    splash.classList.remove("is-spraying");
  }, 950);
}

export default function PinkMatchaFullscreenButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Attach window global methods as requested
    (window as any).enterAppFullscreen = enterAppFullscreen;
    (window as any).sprayPinkScreen = sprayPinkScreen;
  }, []);

  const handleClick = () => {
    void enterAppFullscreen();
    sprayPinkScreen(buttonRef.current);
  };

  return (
    <>
      <button
        ref={buttonRef}
        id="pinkMatchaFullscreenButton"
        className="pink-matcha-button"
        type="button"
        aria-label="Mở chế độ toàn màn hình"
        title="Chế độ toàn màn hình"
        onClick={handleClick}
      >
        <svg
          className="pink-matcha-icon"
          viewBox="0 0 180 180"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cupGlass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fffafd" stopOpacity="0.98" />
              <stop offset="55%" stopColor="#ffeaf4" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#ffcfe2" stopOpacity="0.92" />
            </linearGradient>

            <linearGradient id="pinkDrink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f9aaca" />
              <stop offset="100%" stopColor="#ef78aa" />
            </linearGradient>

            <linearGradient id="darkPinkDrink" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e96e9f" />
              <stop offset="100%" stopColor="#c9477d" />
            </linearGradient>

            <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow
                dx="0"
                dy="5"
                stdDeviation="5"
                floodColor="#d96694"
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          <g filter="url(#softShadow)">
            {/* Ống hút nằm sau lớp kem mèo */}
            <g transform="rotate(-13 53 55)">
              <rect
                x="46"
                y="2"
                width="15"
                height="80"
                rx="7.5"
                fill="#fffafc"
                stroke="#d792ac"
                strokeWidth="4"
              />

              <path
                d="M48 13 L59 26
                   M48 33 L59 46
                   M48 53 L59 66"
                fill="none"
                stroke="#ef83af"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>

            {/* Quai ly */}
            <path
              d="M134 78
                 C165 70 172 92 164 113
                 C158 130 145 140 126 138"
              fill="none"
              stroke="#d792ac"
              strokeWidth="11"
              strokeLinecap="round"
            />

            <path
              d="M136 88
                 C155 84 159 97 154 110
                 C150 120 143 127 130 128"
              fill="none"
              stroke="#fff4f8"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Thân ly */}
            <path
              d="M30 70
                 Q31 61 42 61
                 H132
                 Q143 61 142 72
                 L132 147
                 Q131 158 119 160
                 H54
                 Q41 159 39 147
                 Z"
              fill="url(#cupGlass)"
              stroke="#d792ac"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* Lớp đồ uống hồng phía dưới */}
            <path
              d="M39 112
                 C60 103 81 120 103 110
                 C117 104 129 107 136 111
                 L131 147
                 Q130 155 119 157
                 H54
                 Q44 156 42 146
                 Z"
              fill="url(#darkPinkDrink)"
            />

            {/* Lớp sữa giữa */}
            <path
              d="M37 91
                 C60 84 80 99 103 91
                 C116 87 130 88 139 93
                 L136 116
                 C125 110 116 109 103 114
                 C80 123 60 107 39 116
                 Z"
              fill="#fff3f7"
              opacity="0.96"
            />

            {/* Lớp matcha hồng */}
            <path
              d="M34 72
                 C54 64 75 78 97 70
                 C112 65 128 66 141 73
                 L138 94
                 C127 89 116 87 102 93
                 C80 101 59 87 37 94
                 Z"
              fill="url(#pinkDrink)"
            />

            {/* Vệt sáng trên ly */}
            <path
              d="M48 84
                 C44 104 46 127 53 145"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.65"
            />

            {/* Lớp kem mèo mềm */}
            <path
              d="M35 67
                 C27 55 31 42 43 35
                 L48 21
                 L62 31
                 C71 27 84 25 96 28
                 L110 19
                 L116 35
                 C130 41 137 54 132 67
                 C128 80 113 87 85 87
                 C56 87 42 81 35 67Z"
              fill="#fffafd"
              stroke="#d792ac"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* Tai mèo */}
            <path
              d="M48 25 L53 41 L64 32Z"
              fill="#ffc2d9"
            />

            <path
              d="M109 24 L106 40 L96 31Z"
              fill="#ffc2d9"
            />

            {/* Mắt mèo */}
            <ellipse cx="65" cy="55" rx="6" ry="7" fill="#994565" />
            <ellipse cx="105" cy="55" rx="6" ry="7" fill="#994565" />

            <circle cx="63" cy="52" r="2" fill="#ffffff" />
            <circle cx="103" cy="52" r="2" fill="#ffffff" />

            {/* Má hồng */}
            <ellipse cx="51" cy="65" rx="8" ry="4" fill="#ffabc9" opacity="0.75" />
            <ellipse cx="119" cy="65" rx="8" ry="4" fill="#ffabc9" opacity="0.75" />

            {/* Mũi và miệng */}
            <path
              d="M82 62
                 Q85 65 88 62
                 Q85 69 82 62Z"
              fill="#d56a94"
            />

            <path
              d="M85 66
                 C82 72 77 72 75 68
                 M85 66
                 C88 72 93 72 95 68"
              fill="none"
              stroke="#b85a7d"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Bàn chân mèo nổi trên kem */}
            <g transform="translate(0 1)">
              <ellipse cx="84" cy="77" rx="7" ry="6" fill="#ffc5da" />
              <circle cx="75" cy="72" r="3" fill="#ffc5da" />
              <circle cx="81" cy="68" r="3" fill="#ffc5da" />
              <circle cx="88" cy="68" r="3" fill="#ffc5da" />
              <circle cx="94" cy="72" r="3" fill="#ffc5da" />
            </g>

            {/* Sao lấp lánh */}
            <path
              d="M48 126
                 L51 132
                 L57 135
                 L51 138
                 L48 144
                 L45 138
                 L39 135
                 L45 132Z"
              fill="#ffffff"
            />

            <path
              d="M117 129
                 L119 133
                 L123 135
                 L119 137
                 L117 141
                 L115 137
                 L111 135
                 L115 133Z"
              fill="#ffffff"
              opacity="0.9"
            />
          </g>
        </svg>
      </button>

      {/* Lớp màu hồng nở phủ màn hình */}
      <div id="pinkMatchaSplash" className="pink-matcha-splash" aria-hidden="true">
        <span className="pink-bubble pink-bubble-1"></span>
        <span className="pink-bubble pink-bubble-2"></span>
        <span className="pink-bubble pink-bubble-3"></span>
        <span className="pink-heart pink-heart-1">♥</span>
        <span className="pink-heart pink-heart-2">♥</span>
        <span className="pink-heart pink-heart-3">♥</span>
      </div>
    </>
  );
}
