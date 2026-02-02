import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors } from 'lucide-react';
import confetti from 'canvas-confetti';

const InaugurationScreen = ({ onComplete }) => {
  const [cutProgress, setCutProgress] = useState(0);
  const [isCut, setIsCut] = useState(false);
  const ribbonRef = useRef(null);

  // Auto-complete logic for simple click interactions
  const handleCut = () => {
    if (isCut) return;
    setIsCut(true);
    triggerConfetti();
    setTimeout(onComplete, 2000); // Wait for animation to finish before unmounting
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
      // Launch confetti from the cut point (center)
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0.4, y: 0.5 },
        colors: ['#ffb7b2', '#b2e2f2', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 0.6, y: 0.5 },
        colors: ['#ffb7b2', '#b2e2f2', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  return (
    <motion.div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center cursor-none touch-none"
      exit={{ opacity: 0, transition: { duration: 1 } }}
    >
      <div className="absolute top-10 text-white/80 font-bold text-xl animate-bounce">
        Cut to Open ✨
      </div>

      {/* The Ribbon Container */}
      <div 
        ref={ribbonRef}
        className="relative w-full h-32 flex items-center justify-center"
        onClick={handleCut}
      >
        {/* Left Ribbon Half */}
        <motion.div 
          className="h-20 bg-gradient-to-r from-red-500 to-red-600 shadow-2xl relative"
          style={{ width: '50%' }}
          animate={isCut ? { 
            x: -1000, 
            rotate: -15, 
            opacity: 0,
            transition: { duration: 1.5, ease: "circIn" }
          } : {}}
        >
          {/* Gold Trim */}
          <div className="absolute top-2 bottom-2 left-0 right-0 border-y-2 border-yellow-400/50 border-dashed" />
        </motion.div>

        {/* Right Ribbon Half */}
        <motion.div 
          className="h-20 bg-gradient-to-l from-red-500 to-red-600 shadow-2xl relative"
          style={{ width: '50%' }}
          animate={isCut ? { 
            x: 1000, 
            rotate: 15, 
            opacity: 0,
            transition: { duration: 1.5, ease: "circIn" }
          } : {}}
        >
           {/* Gold Trim */}
           <div className="absolute top-2 bottom-2 left-0 right-0 border-y-2 border-yellow-400/50 border-dashed" />
        </motion.div>

        {/* The Knot / Bow (Center) */}
        {!isCut && (
          <motion.div 
            className="absolute z-10"
            exit={{ scale: 0, opacity: 0 }}
          >
            <div className="relative">
               {/* Bow loops */}
               <div className="absolute -left-12 -top-10 w-16 h-16 rounded-full border-[10px] border-red-600 rotate-[-15deg] shadow-lg" />
               <div className="absolute -right-12 -top-10 w-16 h-16 rounded-full border-[10px] border-red-600 rotate-[15deg] shadow-lg" />
               
               {/* Center Knot (Clickable target) */}
               <motion.button
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 className="w-16 h-16 bg-red-700 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-4 border-yellow-400 flex items-center justify-center relative z-20"
               >
                  <div className="w-10 h-10 border-2 border-dashed border-white/30 rounded-full animate-spin-slow" />
               </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Scissors Cursor Follower */}
      <ScissorsFollower isCut={isCut} />

    </motion.div>
  );
};

const ScissorsFollower = ({ isCut }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  if (isCut) return null;

  return (
    <motion.div
      className="fixed pointer-events-none z-[110] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
      style={{
        left: 0,
        top: 0,
        x: mousePos.x - 20, // Center offset
        y: mousePos.y - 120, // Tip of scissors at mouse
      }}
    >
      <Scissors size={200} className="text-gray-100 rotate-[130deg]" strokeWidth={1} />
    </motion.div>
  );
}

export default InaugurationScreen;
