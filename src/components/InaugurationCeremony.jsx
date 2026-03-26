import React, { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import knotImg from '../assets/knot_transparent.png';
import ribbonImg from '../assets/ribbon.png';

const InaugurationCeremony = ({ onComplete }) => {
  const [isCut, setIsCut] = useState(false);

  const handleCut = () => {
    setIsCut(true);
    triggerConfetti();
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const triggerConfetti = () => {
    const end = Date.now() + 2 * 1000;
    const colors = ['#ffb7b2', '#ffccb6', '#fdfd96', '#ffffff'];

    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, transition: { duration: 1 } }}
      className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-3xl flex flex-col items-center justify-center cursor-pointer"
      onClick={handleCut}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
      
      {/* Ribbon Line Left */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isCut ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-1/2 left-0 right-1/2 h-24 shadow-lg origin-left z-0"
        style={{ 
          backgroundImage: `url(${ribbonImg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* Ribbon Line Right */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isCut ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-1/2 left-1/2 right-0 h-24 shadow-lg origin-right z-0"
        style={{ 
          backgroundImage: `url(${ribbonImg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          transform: 'translateY(-50%)' 
        }}
      />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: isCut ? 0 : 1, rotate: isCut ? 180 : 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="relative z-20 drop-shadow-[0_20px_20px_rgba(0,0,0,0.3)] filter translate-y-30" // Moved down further to align with ribbon
      >
        <img src={knotImg} alt="Ribbon Knot" className="w-72 h-72 object-contain drop-shadow-2xl" /> {/* Slightly larger knot */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full text-primary font-black text-xs uppercase tracking-widest shadow-xl border border-white/60 animate-pulse">
                Tap to Open
             </div>
        </div>
      </motion.div>

      <motion.div 
         initial={{ opacity: 0, y: 50 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 1 }}
         className="mt-12 text-center relative z-10"
      >
         <h1 className="text-4xl font-black text-primary mb-2 drop-shadow-md"> Welcome Home Miss Afiii..</h1>
         <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Tap to inaugurate the vault </p>
      </motion.div>

    </motion.div>
  );
};

export default InaugurationCeremony;
