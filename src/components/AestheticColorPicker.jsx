import React, { useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AestheticColorPicker = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determine if it's a tailwind class or a custom CSS string
  const isCustom = color && !color.startsWith('bg-');
  const displayColor = isCustom ? color : '#ffb7b2'; 

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-2xl border-2 border-primary/10 hover:border-primary/30 transition-all group shadow-sm overflow-hidden relative"
      >
        {/* Animated background hint */}
        <div 
          className="absolute inset-0 opacity-10 transition-colors"
          style={{ [isCustom ? 'background' : 'backgroundColor']: displayColor }}
        />
        
        <div className="flex items-center gap-3 relative z-10">
          <div 
            className="w-8 h-8 rounded-xl shadow-lg border-2 border-white transition-transform group-hover:scale-110"
            style={{ [isCustom ? 'background' : 'backgroundColor']: displayColor }}
          />
          <div className="text-left">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Advanced Color</p>
            <p className="text-xs font-bold text-gray-500">Gradients & Opacity</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {isCustom && <Sparkles size={14} className="text-yellow-500 animate-pulse" />}
          <div className={cn("p-1.5 rounded-full bg-white/50 transition-transform duration-300", isOpen ? "rotate-180" : "rotate-0")}>
            <ChevronDown size={16} className="text-primary" />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop for the bubble only */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60]"
            />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-full left-0 right-0 mb-4 z-[70] p-6 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Gradient Engine</span>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-black/5 rounded-full transition-colors"
                >
                  <ChevronDown size={16} className="text-gray-400 rotate-180" />
                </button>
              </div>

              <div className="flex justify-center custom-picker-container scale-90 sm:scale-100 origin-top">
                <ColorPicker 
                  value={displayColor} 
                  onChange={onChange}
                  hidePresets
                  hideAdvancedSliders={false}
                  hideColorGuide
                  hideInputType
                  width={280}
                  height={180}
                />
              </div>
              
              <style jsx="true">{`
                .custom-picker-container [class*="rbgcp-"] {
                  font-family: inherit !important;
                  border-radius: 1.5rem !important;
                  background: transparent !important;
                  border: none !important;
                }
                .custom-picker-container [class*="rbgcp-input"] {
                  background: white !important;
                  border-radius: 0.75rem !important;
                  border: 2px solid #f3f4f6 !important;
                  font-weight: bold !important;
                  font-size: 10px !important;
                }
                .custom-picker-container [class*="rbgcp-handler"] {
                  border: 2px solid white !important;
                  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
                }
              `}</style>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AestheticColorPicker;
