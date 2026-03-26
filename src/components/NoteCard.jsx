import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Unlock, Lock, Eye, Send, Trash2, Edit2, Maximize2, X, Image as ImageIcon, Film } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MediaCarousel = ({ media }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % media.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div className="relative mt-6 h-64 w-full perspective-1000 flex items-center justify-center overflow-hidden rounded-3xl bg-black/5 border border-white/20 backdrop-blur-sm">
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {media.map((item, index) => {
            const offset = (index - activeIndex + media.length) % media.length;
            const normalizedOffset = offset > media.length / 2 ? offset - media.length : offset;
            const isCenter = normalizedOffset === 0;
            const absOffset = Math.abs(normalizedOffset);

            // Hide items that are too far away
            if (absOffset > 2) return null;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: 1 - absOffset * 0.3,
                  scale: 1 - absOffset * 0.2,
                  x: normalizedOffset * 120,
                  z: -absOffset * 100,
                  rotateY: normalizedOffset * -30,
                  zIndex: 10 - absOffset,
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute w-44 h-56 rounded-2xl overflow-hidden shadow-2xl cursor-pointer border-2 border-white/50"
                onClick={(e) => { e.stopPropagation(); setActiveIndex(index); }}
              >
                {item.type.startsWith('video/') ? (
                  <video 
                    src={item.signed_url} 
                    className="w-full h-full object-cover"
                    autoPlay={isCenter}
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img 
                    src={item.signed_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                )}
                {!isCenter && <div className="absolute inset-0 bg-black/20" />}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {media.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-4 z-20 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
          >
            ←
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 z-20 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
          >
            →
          </button>
        </>
      )}
      
      <div className="absolute bottom-4 flex gap-1.5 z-20">
        {media.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              i === activeIndex ? "bg-white w-4" : "bg-white/30"
            )} 
          />
        ))}
      </div>
    </div>
  );
};

const NoteCard = ({ note, onReveal, onUnreveal, onLike, onUnlike, onSeen, currentUser, onDelete, onEdit }) => {
  const isOwner = note.author_id === currentUser.id;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPreview = (text) => {
    const words = text.split(' ');
    if (words.length <= 5) return text;
    return words.slice(0, 5).join(' ') + '...';
  };

  const handleRevealClick = () => {
    if (isOwner) {
      if (!note.is_revealed) {
        onReveal(note.id);
      } else {
        onUnreveal(note.id);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      whileHover={{ y: -10, rotateZ: 1, scale: 1.02, transition: { type: "spring", stiffness: 300 } }}
      className={cn(
        "card-cute min-h-[220px] flex flex-col justify-between relative group shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-t-2 border-white/80 cursor-pointer transition-all duration-300",
        note.color
      )}
      onClick={() => {
        setIsExpanded(!isExpanded);
        if (!isExpanded && onSeen) onSeen(note.id);
      }}
    >
      <div className="absolute top-4 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-2 z-10">
        {isOwner && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="p-2 bg-white/80 hover:bg-white rounded-full text-primary shadow-md hover:scale-110 transition-all">
              <Edit2 size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="p-2 bg-white/80 hover:bg-white rounded-full text-red-500 shadow-md hover:scale-110 transition-all">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md">
              {note.is_revealed ? <Sparkles size={14} className="text-yellow-500" /> : <Unlock size={14} className="text-primary" />}
            </div>
            <h3 className="font-extrabold text-lg leading-tight text-gray-900 drop-shadow-sm">
              {note.title}
            </h3>
          </div>
          <span className="text-[10px] font-black text-gray-500 bg-white/40 px-2 py-1 rounded-full">{formatDate(note.created_at)}</span>
        </div>
        
        <p className="text-sm leading-relaxed font-bold text-gray-800 bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 break-words whitespace-pre-wrap">
          {isExpanded ? note.content : getPreview(note.content)}
        </p>
        
        {note.media && note.media.length > 0 && isExpanded && (
          <MediaCarousel media={note.media} />
        )}

        {!isExpanded && note.media && note.media.length > 0 && (
          <div className="mt-3 flex gap-1">
            <div className="px-2 py-1 bg-white/40 backdrop-blur-sm rounded-lg border border-white/20 text-[9px] font-black text-primary uppercase tracking-tighter">
               {note.media.length} {note.media.length === 1 ? 'Memory' : 'Memories'} Attached ✨
            </div>
          </div>
        )}

        {isExpanded && !note.media?.length && note.content.split(' ').length > 5 && (
          <p className="text-xs text-primary font-black mt-2 text-center">
            Tap to read more ↓
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-y-3 mt-6 pt-4 border-t border-black/10">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
           <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[10px] font-black shadow-md uppercase text-primary border-2 border-primary/10 shrink-0">
             {note.author_name ? note.author_name[0] : '?'}
           </div>
           <div className="flex items-center gap-1.5 overflow-hidden">
             <span className="text-xs font-black text-gray-900 uppercase tracking-wider truncate">
              {isOwner ? 'Me' : note.author_name}
            </span>
          </div>
          {/* Seen badge — shown to author */}
          {isOwner && note.is_seen && (
            <span className="flex items-center gap-1 text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shrink-0">
              <Eye size={10} /> Seen
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Like button — shown to recipient on revealed notes */}
          {!isOwner && note.is_revealed && (
            <button
              onClick={(e) => { e.stopPropagation(); note.is_liked ? onUnlike(note.id) : onLike(note.id); }}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-black transition-all active:scale-90 border-2 ${
                note.is_liked
                  ? 'bg-red-50 text-red-500 border-red-200 shadow-inner'
                  : 'bg-white/60 text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-400'
              }`}
            >
              <Heart size={12} fill={note.is_liked ? 'currentColor' : 'none'} />
              {note.is_liked ? 'Liked!' : 'Like'}
            </button>
          )}

          {/* Liked badge — shown to author when recipient liked */}
          {isOwner && note.is_liked && (
            <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              <Heart size={10} fill="currentColor" /> Liked!
            </span>
          )}

          {isOwner && !note.is_revealed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRevealClick(); }}
              className="flex items-center gap-2 text-xs bg-primary text-white hover:bg-primary-dark px-4 py-2 rounded-xl transition-all font-black shadow-lg active:scale-95 border-b-4 border-black/20"
            >
              <Send size={12} /> Reveal
            </button>
          )}

          {isOwner && note.is_revealed && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRevealClick(); }}
              className="flex items-center gap-2 text-xs bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-xl transition-all font-black shadow-lg active:scale-95 border-b-4 border-black/20"
            >
              <Lock size={12} /> Unreveal
            </button>
          )}

          {!isOwner && note.is_revealed && (
            <div className="flex items-center gap-1 text-[10px] font-black text-green-800 bg-green-100 px-3 py-1.5 rounded-lg shadow-inner border border-green-200">
              REVEALED 🌹
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default NoteCard;
