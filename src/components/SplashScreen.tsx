import React from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <img 
        src="https://i.postimg.cc/Bbm3Wk7S/e90e36c0bdaf57b179b8e8aa001b3e31.jpg" 
        alt="Splash Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        referrerPolicy="no-referrer"
      />
      
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <div className="text-white text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-widest drop-shadow-lg" style={{ fontFamily: 'var(--font-sans)' }}>
            Dâu tây chấm sữa
          </h1>
          <p className="text-white/80 italic drop-shadow-md">Chào mừng vợ yêu đến với góc nhỏ của chúng mình</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onEnter}
          className="group relative p-6 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all shadow-2xl"
          aria-label="Enter App"
        >
          <div className="absolute inset-0 bg-pink-400/20 rounded-full blur-xl group-hover:bg-pink-400/40 transition-all" />
          <Heart 
            className="w-12 h-12 text-pink-400 fill-pink-400 group-hover:text-pink-500 group-hover:fill-pink-500 transition-colors drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]" 
          />
        </motion.button>
      </motion.div>
      
      {/* Subtle floating particles effect could be added here if desired */}
    </motion.div>
  );
};

export default SplashScreen;
