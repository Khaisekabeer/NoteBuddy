import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Unlock, Lock, Eye, Send, Trash2, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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
        
        {note.media_signed_url && (
          <div className="mt-3 rounded-xl overflow-hidden shadow-inner border border-black/10 bg-black/5 flex items-center justify-center">
            {note.media_type && note.media_type.startsWith('video/') ? (
              <video 
                src={note.media_signed_url} 
                controls={isExpanded}
                autoPlay={false}
                muted
                className={cn("w-full object-cover transition-all duration-300", isExpanded ? "max-h-[400px]" : "h-24 opacity-80")}
              />
            ) : (
              <img 
                src={note.media_signed_url} 
                alt="Attached memory" 
                className={cn("w-full object-cover transition-all duration-300", isExpanded ? "max-h-[400px]" : "h-24 opacity-80")}
              />
            )}
          </div>
        )}

        {!isExpanded && note.content.split(' ').length > 5 && !note.media_signed_url && (
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
