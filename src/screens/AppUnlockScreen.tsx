import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Heart, Sparkles, Key, Lock, ChevronUp } from "lucide-react";

type Props = {
  active: boolean;
  appId: string;
  onUnlock: () => void;
  onBack: () => void;
  time: string;
  date: string;
};

const appData: Record<string, { name: string; wallpaper: string; msg: string; accentColor: string; icon: string }> = {
  lipstick: {
    name: "Lipstick Prompt (Cây Son)",
    wallpaper: "https://i.postimg.cc/SR6KbDxB/cb535764613eeef9220bea58d05babfd.jpg",
    msg: "Chào mừng vợ yêu đến với Thế giới Son Môi diệu kỳ! Hãy trượt chiếc chìa khóa thỏ nhỏ lên trên để bắt đầu tạo ra những tác phẩm nghệ thuật mỹ phẩm siêu lung linh nha vợ yêu của chồng! 🐰💄✨",
    accentColor: "from-pink-500 to-rose-600",
    icon: "💄"
  },
  promptMarkdown: {
    name: "Studio Prompt",
    wallpaper: "https://i.postimg.cc/3x7vNDMv/f611dc0acb4f072dd942c38db713958f.jpg",
    msg: "Chào mừng vợ yêu đến với Không gian sáng tạo Studio Prompt! Nơi chồng đã chuẩn bị sẵn mọi ngữ cảnh thông minh nhất. Vợ yêu hãy trượt lên để mở ra cánh cửa ý tưởng vô tận nha! 💕✨",
    accentColor: "from-purple-500 to-indigo-600",
    icon: "✨"
  },
  apiProxy: {
    name: "Cài Đặt API Proxy",
    wallpaper: "https://i.postimg.cc/RZVZ215j/6811e5166e7ea3f19264946a744997bf.jpg",
    msg: "Chào mừng bà xã đến với Cổng cấu hình API Proxy! Trượt nhẹ lên trên để mở khóa thiết lập hệ thống, chồng yêu sẽ lo liệu mọi đường truyền mượt mà nhất cho vợ yêu! 💖⚙️🌟",
    accentColor: "from-pink-400 to-purple-600",
    icon: "⚙️"
  }
};

export default function AppUnlockScreen({ active, appId, onUnlock, onBack, time, date }: Props) {
  const currentApp = appData[appId] || {
    name: "Ứng dụng",
    wallpaper: "https://i.postimg.cc/nzdFgNvs/215b99c879bdd6e6511287efda1b90ee.jpg",
    msg: "Hãy trượt lên để mở khóa vào ứng dụng vợ yêu nhé! 💖",
    accentColor: "from-pink-500 to-purple-500",
    icon: "📱"
  };

  const [dragProgress, setDragProgress] = useState(0);

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-between"
        style={{
          backgroundImage: `url(${currentApp.wallpaper})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Soft, beautiful light pink backdrop overlay for extreme transparency */}
        <div className="absolute inset-0 bg-pink-100/10 backdrop-blur-[3px] z-0 pointer-events-none" />

        {/* Decorative ambient gradients (Light Pink instead of Black) */}
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-pink-200/20 to-transparent pointer-events-none z-0" />
        <div className="absolute bottom-0 inset-x-0 h-80 bg-gradient-to-t from-pink-300/30 to-transparent pointer-events-none z-0" />

        {/* Back button */}
        <div className="relative z-10 p-4 flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition-all border border-white/20 backdrop-blur-md"
          >
            ← Quay lại
          </button>
          
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-pink-500/20 text-pink-200 text-[10px] font-black uppercase tracking-widest border border-pink-500/30 backdrop-blur-sm animate-pulse">
            <Lock className="w-3 h-3" />
            <span>Màn hình khóa App ୨ৎ</span>
          </div>
        </div>

        {/* TIME & DATE DISPLAY */}
        <div className="relative z-10 text-center mt-4 px-6">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
            className="text-6xl font-black text-white tracking-tight drop-shadow-lg select-none font-sans"
          >
            {time}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-semibold text-pink-100/90 mt-1.5 tracking-wider drop-shadow-md select-none"
          >
            {date}
          </motion.p>
        </div>

        {/* MAIN SWEET DIALOG CARD */}
        <div className="relative z-10 px-6 max-w-md mx-auto w-full mb-6">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 80, damping: 15 }}
            className="p-5 rounded-3xl bg-pink-100/10 border border-white/30 backdrop-blur-md shadow-2xl text-center relative overflow-hidden"
          >
            {/* Ambient glow in card background */}
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-500 text-white text-2xl flex items-center justify-center mx-auto mb-3 shadow-md border border-white/20">
              {currentApp.icon}
            </div>

            <h2 className="text-base font-black text-white tracking-wide uppercase">
              {currentApp.name}
            </h2>

            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-pink-400 to-transparent mx-auto my-3" />

            <p className="text-[12px] text-pink-50/90 leading-relaxed font-medium px-1">
              {currentApp.msg}
            </p>
          </motion.div>
        </div>

        {/* SLIDE UP TO UNLOCK TRACK */}
        <div className="relative z-10 px-6 pb-12 w-full max-w-sm mx-auto flex flex-col items-center">
          {/* Pulsing indicator icon */}
          <motion.div 
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="flex flex-col items-center mb-1 text-white/60 pointer-events-none"
          >
            <ChevronUp className="w-5 h-5 text-pink-300" />
          </motion.div>

          <div className="w-full h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-md relative flex items-center justify-center overflow-hidden p-1 shadow-inner">
            {/* Background glowing progress track */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-500/30 to-purple-500/30 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, dragProgress * 100))}%` }}
            />

            {/* Glowing guide text */}
            <motion.span
              style={{ opacity: 1 - dragProgress * 1.5 }}
              className="absolute pointer-events-none text-[11px] font-black uppercase tracking-widest text-pink-100 flex items-center gap-1.5 select-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
              Kéo lên để mở khóa 💖
            </motion.span>

            {/* Slider Drag Handle Container */}
            <div className="absolute inset-y-1 left-1 right-1 flex flex-col justify-end">
              <motion.div
                drag="y"
                dragConstraints={{ top: -110, bottom: 0 }}
                dragElastic={0.15}
                dragMomentum={false}
                onDrag={(event, info) => {
                  // Calculate fraction of drag completed (up to -110px)
                  const distance = Math.abs(info.offset.y);
                  const progress = Math.min(1, distance / 110);
                  setDragProgress(progress);
                }}
                onDragEnd={(event, info) => {
                  if (info.offset.y <= -85) {
                    // Trigger unlock!
                    setDragProgress(1);
                    onUnlock();
                  } else {
                    // Snap back
                    setDragProgress(0);
                  }
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 via-rose-500 to-purple-600 text-white flex items-center justify-center cursor-pointer shadow-xl border border-white/30 hover:brightness-105 active:scale-95 transition-all self-center absolute"
                style={{ bottom: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Heart className="w-6 h-6 fill-white" />
                </motion.div>
              </motion.div>
            </div>
          </div>

          <p className="text-[10px] text-white/50 font-semibold tracking-wider uppercase mt-3">
            Hoặc nhấp đúp vào trái tim để mở nhanh 💖
          </p>

          {/* Quick double click handler for accessibility / backup */}
          <button 
            onClick={onUnlock} 
            className="mt-1 text-[11px] font-extrabold text-pink-300 hover:text-pink-200 active:scale-95 transition-all bg-white/5 px-3 py-1 rounded-full border border-white/10"
          >
            Nhấp mở khóa nhanh 🔓
          </button>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
