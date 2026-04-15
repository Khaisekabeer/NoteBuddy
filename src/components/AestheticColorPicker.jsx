import React, { useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const AestheticColorPicker = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determine if it's a tailwind class or a custom CSS string
  const isCustom = color && !color.startsWith('bg-');
  const displayColor = isCustom ? color : '#ffb7b2'; 

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-2xl border-2 border-primary/10 hover:border-primary/30 transition-all group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-xl shadow-lg border-2 border-white"
            style={{ [isCustom ? 'background' : 'backgroundColor']: displayColor }}
          />
          <div className="text-left">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Advanced Color</p>
            <p className="text-xs font-bold text-gray-500">Gradients & Opacity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCustom && <Sparkles size={14} className="text-yellow-500 animate-pulse" />}
          {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-inner flex justify-center custom-picker-container">
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
                border-radius: 1rem !important;
                background: transparent !important;
                border: none !important;
              }
              .custom-picker-container [class*="rbgcp-input"] {
                background: white !important;
                border-radius: 0.5rem !important;
                border: 1px solid #eee !important;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AestheticColorPicker;
