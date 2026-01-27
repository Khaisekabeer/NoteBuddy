import React, { useState, useEffect } from 'react'
import { Plus, Search, Heart, User, Users, StickyNote, Eye, Lock, Unlock, Sparkles, Send, Trash2, LogOut, Settings, Key, ShieldCheck, Edit2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import confetti from 'canvas-confetti'
import { api } from './services/api'
import { io } from 'socket.io-client'

const socket = io(window.location.origin);

const FloatingHearts = () => {
  const [hearts, setHearts] = useState([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Math.random();
      const left = Math.random() * 95;
      const size = Math.random() * (30 - 15) + 15;
      const duration = Math.random() * (20 - 10) + 10;
      setHearts(prev => [...prev, { id, left, size, duration }]);
      setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), duration * 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {hearts.map(h => (
        <div key={h.id} className="floating-heart text-primary/15" style={{ left: `${h.left}%`, fontSize: `${h.size}px`, animationDuration: `${h.duration}s`, bottom: '-50px' }}>
          <Heart fill="currentColor" />
        </div>
      ))}
    </div>
  );
};

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const NoteCard = ({ note, onReveal, currentUser, onDelete, onEdit }) => {
  const isOwner = note.author_id === currentUser.id;
  const [isExpanded, setIsExpanded] = React.useState(false);
  
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
    if (isOwner && !note.is_revealed) {
      onReveal(note.id);
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
      onClick={() => setIsExpanded(!isExpanded)}
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
        
        <p className="text-sm leading-relaxed font-bold text-gray-800 bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30 break-words">
          {isExpanded ? note.content : getPreview(note.content)}
        </p>
        
        {!isExpanded && note.content.split(' ').length > 5 && (
          <p className="text-xs text-primary font-black mt-2 text-center">
            Tap to read more ↓
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-black/10">
        <div className="flex items-center gap-2">
           <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[10px] font-black shadow-md uppercase text-primary border-2 border-primary/10">
             {note.author_name ? note.author_name[0] : '?'}
           </div>
           <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
            {isOwner ? 'Me' : note.author_name}
          </span>
        </div>
        
        {isOwner && !note.is_revealed && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleRevealClick(); }}
            className="flex items-center gap-2 text-xs bg-primary text-white hover:bg-primary-dark px-4 py-2 rounded-xl transition-all font-black shadow-lg active:scale-95 border-b-4 border-black/20"
          >
            <Send size={12} /> Reveal
          </button>
        )}

        {!isOwner && note.is_revealed && (
           <div className="flex items-center gap-1 text-[10px] font-black text-green-800 bg-green-100 px-3 py-1.5 rounded-lg shadow-inner border border-green-200">
             REVEALED 🌹
           </div>
        )}
      </div>
    </motion.div>
  )
}

const AuthScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.login(username, password);
      if (data.user) onLogin(data.user);
      else setError(data.message || 'Login failed');
    } catch (err) {
      setError('Something went wrong. Is the backend running?');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <FloatingHearts />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 rounded-full blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_30px_70px_rgba(0,0,0,0.1)] w-full max-w-sm border-2 border-white relative z-10"
      >
        <div className="flex flex-col items-center mb-8 relative z-20">
           <div className="p-3 bg-white rounded-[2rem] shadow-xl border-4 border-primary/20 mb-4">
             <img src="/logo.png" className="w-20 h-20" />
           </div>
           <h1 className="text-4xl font-black text-primary drop-shadow-sm">NoteBuddy</h1>
           <p className="text-gray-600 font-bold text-sm text-center mt-2 px-4">Our private world of memories. 💖</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-20">
           <div className="space-y-1">
             <label className="text-[10px] font-black text-primary uppercase px-4 tracking-widest">Username</label>
             <input 
              type="text" 
              placeholder="Your name..." 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary outline-none font-bold shadow-inner text-gray-800" 
             />
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-primary uppercase px-4 tracking-widest">Password</label>
             <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary outline-none font-bold shadow-inner text-gray-800" 
             />
           </div>
           {error && <p className="text-red-500 text-xs font-black text-center animate-bounce">{error}</p>}
           <button className="btn-cute bg-primary text-white justify-center py-4 shadow-2xl shadow-primary/40 border-b-4 border-primary/20 active:border-b-0 hover:scale-[1.02]">
             Unlock Our Memories 🔑
           </button>
        </form>


      </motion.div>
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('mine')
  const [notes, setNotes] = useState([])
  const [seenNoteIds, setSeenNoteIds] = useState(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'bg-[#ffb7b2]', is_revealed: false, recipient_username: '' })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '' })
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' })

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSettingsMessage({ text: '', type: '' });
    const res = await api.changePassword(passwordData.current, passwordData.new);
    if (res.message.includes('successfully')) {
      setSettingsMessage({ text: res.message, type: 'success' });
      setPasswordData({ current: '', new: '' });
      setTimeout(() => setIsSettingsOpen(false), 2000);
    } else {
      setSettingsMessage({ text: res.message, type: 'error' });
    }
  }
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotes();
      // Join socket room
      socket.emit('join', currentUser.id);

      // Listen for real-time reveals
      const handleNoteRevealed = (payload) => {
        fetchNotes(); // Refresh to get the new note
        triggerConfetti();
      };

      socket.on('note_revealed', handleNoteRevealed);
      return () => socket.off('note_revealed', handleNoteRevealed);
    }
  }, [currentUser]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        localStorage.removeItem('token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotes = async () => {
    const data = await api.getNotes();
    if (Array.isArray(data)) {
      setNotes(data);
    }
  };

  const triggerConfetti = () => {
    const end = Date.now() + 2 * 1000;
    const colors = ['#ffb7b2', '#b2e2f2', '#d1e9cf', '#ffccb6', '#fdfd96'];

    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }

  const handleAddNote = async () => {
    if (!newNote.title || !newNote.content) return;
    
    if (editingNote) {
      await api.updateNote(editingNote.id, newNote);
    } else {
      const recipient = currentUser.username === 'khai' ? 'bestie' : 'khai';
      await api.createNote({ ...newNote, recipient_username: recipient });
    }
    
    setIsAdding(false);
    setEditingNote(null);
    setNewNote({ title: '', content: '', color: 'bg-[#ffb7b2]', is_revealed: false, recipient_username: '' });
    fetchNotes();
    
    if (!editingNote) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: [newNote.color.replace('bg-[', '').replace(']', '')]
      });
    }
  }

  const handleEdit = (note) => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      color: note.color,
      is_revealed: note.is_revealed === 1
    });
    setIsAdding(true);
  }

  const handleReveal = async (id) => {
    await api.revealNote(id);
    fetchNotes();
    triggerConfetti();
  }

  const handleDelete = async (id) => {
    await api.deleteNote(id);
    fetchNotes();
  }

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center font-bold text-primary">Loading...</div>;

  if (!currentUser) return <AuthScreen onLogin={setCurrentUser} />;

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         n.content.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Logic:
    // 'mine' -> Show everything I wrote (revealed or not)
    // 'friend' -> Show only what the other person revealed to me
    if (view === 'mine') return n.author_id === currentUser.id;
    if (view === 'friend') return n.author_id !== currentUser.id;
    return true;
  })

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-cute text-text overflow-hidden relative">
      <FloatingHearts />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/50 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Sidebar / Mobile Bottom Nav */}
      <aside className={cn(
        "fixed transition-all duration-300 z-50",
        "bottom-6 left-6 right-6 md:relative md:bottom-0 md:left-0 md:right-0 md:w-64", // Mobile: Floating Bar, Desktop: Sidebar
        "bg-white/95 md:bg-white/99 backdrop-blur-3xl p-2 md:p-6 flex flex-row md:flex-col gap-2 md:gap-8 md:min-h-screen",
        "border-2 md:border-0 md:border-r border-primary/20 md:border-primary/50",
        "rounded-[2.5rem] md:rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] md:shadow-none"
      )}>
        <div className="hidden md:flex flex-col gap-6 px-2 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border-4 border-primary/30">
              <img src="/logo.png" alt="NoteBuddy Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-primary drop-shadow-sm uppercase">NoteBuddy</h1>
          </div>
          
          <div className="p-4 bg-primary/15 rounded-3xl flex items-center justify-between border-2 border-primary/20 shadow-sm transition-all hover:bg-primary/20">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-tighter">My Account</span>
                <span className="text-sm font-black text-gray-900 truncate">{currentUser.username}</span>
             </div>
             <div className="flex gap-1">
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-primary/20 text-primary rounded-xl transition-colors">
                  <Settings size={18} />
               </button>
               <button onClick={handleLogout} className="p-2 hover:bg-red-100 text-red-500 rounded-xl transition-colors">
                  <LogOut size={18} />
               </button>
             </div>
          </div>
        </div>

        <nav className="flex flex-row md:flex-col gap-2 flex-1 items-center md:items-stretch justify-around md:justify-start">
          <button onClick={() => setView('mine')} className={cn(
            "btn-cute justify-center md:justify-start shadow-none flex-1 md:flex-none py-3 md:py-4 px-2 md:px-6 rounded-[2rem] transition-all",
            view === 'mine' ? "bg-primary text-white shadow-xl scale-105 font-black" : "text-gray-500 hover:bg-primary/5 font-bold"
          )}>
            <User size={view === 'mine' ? 24 : 22} />
            <span className="hidden md:inline text-sm uppercase tracking-widest px-2">My Stories</span>
          </button>

          <button onClick={() => setIsAdding(true)} className="md:hidden w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform border-4 border-white">
            <Plus size={32} />
          </button>

          <button onClick={() => setView('friend')} className={cn(
            "btn-cute justify-center md:justify-start shadow-none flex-1 md:flex-none py-3 md:py-4 px-2 md:px-6 rounded-[2rem] transition-all",
            view === 'friend' ? "bg-primary text-white shadow-xl scale-105 font-black" : "text-gray-500 hover:bg-primary/5 font-bold"
          )}>
            <div className="relative">
              <StickyNote size={view === 'friend' ? 24 : 22} />
              {view !== 'friend' && notes.some(n => n.author_id !== currentUser.id && n.is_revealed === 1) && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white animate-ping" />
              )}
            </div>
            <span className="hidden md:inline text-sm uppercase tracking-widest px-2">
              {currentUser.username === 'khai' ? "Her Stories" : "His Stories"}
            </span>
          </button>
        </nav>

        {/* Memory Meter */}
        <div className="hidden md:block mt-auto p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-[2.5rem] border border-white/50 shadow-inner">
           <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Our Memory Jar</span>
           </div>
           <div className="h-4 w-full bg-white rounded-full overflow-hidden shadow-sm border border-primary/10 mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((notes.filter(n => n.is_revealed === 1).length / 20) * 100, 100)}%` }}
                className="h-full bg-gradient-to-r from-primary to-secondary"
              />
           </div>
           <p className="text-[10px] font-bold text-gray-400 text-center">
             {notes.filter(n => n.is_revealed === 1).length} shared memories so far... 💖
           </p>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 pb-32 md:pb-12 overflow-y-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="md:hidden w-full flex justify-between items-center bg-white/60 p-4 rounded-3xl backdrop-blur-lg border border-white/80 shadow-sm mb-2">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md border-2 border-primary/20">
                  <img src="/logo.png" alt="Logo" className="w-7 h-7 object-cover" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-primary leading-tight">NoteBuddy</h1>
                  <p className="text-[10px] font-bold text-gray-400">Hi, {currentUser.username}! 👋</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-primary/10 text-primary rounded-xl"><Settings size={18} /></button>
                <button onClick={handleLogout} className="p-2 bg-red-50 text-red-400 rounded-xl"><LogOut size={18} /></button>
             </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black mb-1 uppercase tracking-tight text-gray-800 drop-shadow-sm">Our Secret Corner 💖</h2>
            <p className="text-xs md:text-sm font-bold italic text-gray-500">Sharing love, one note at a time.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 shadow-xl rounded-2xl border-2 border-white/50">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search memories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm rounded-2xl border-none outline-none font-bold text-gray-800" />
            </div>
            <button onClick={() => { setEditingNote(null); setIsAdding(true); }} className="hidden md:flex btn-cute bg-primary text-white hover:bg-primary/90 shadow-xl">
              <Plus size={24} /> <span>Write Love Note</span>
            </button>
          </div>
        </header>

        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode='popLayout'>
            {filteredNotes.map(note => <NoteCard key={note.id} note={note} onReveal={handleReveal} currentUser={currentUser} onDelete={handleDelete} onEdit={handleEdit} />)}
          </AnimatePresence>
        </motion.div>

        {filteredNotes.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 opacity-50">
             <Heart className="text-primary mb-4" size={40} fill="currentColor" />
             <p className="font-bold text-gray-400">No memories yet... write one! 🌹</p>
           </div>
        )}

        {/* Mobile Spacer to avoid overlap with floating bar */}
        <div className="h-24 md:hidden" />
      </main>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setEditingNote(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-50 border-2 border-primary/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-primary">
                {editingNote ? 'Edit Love Note' : 'Write a Love Note'} <Heart className="text-primary" size={20} fill="currentColor" />
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-primary uppercase px-1 tracking-widest">Send To</label>
                  <input 
                    type="text" 
                    placeholder="Recipient username (optional)" 
                    value={newNote.recipient_username || ''} 
                    onChange={e => setNewNote({...newNote, recipient_username: e.target.value})} 
                    className="w-full p-3 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-primary outline-none font-bold text-gray-800 transition-all shadow-inner text-sm" 
                  />
                </div>
                <input type="text" placeholder="Give it a sweet title..." value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none border-b-2 border-gray-100 focus:border-primary outline-none focus:ring-0 font-bold text-gray-800 transition-all shadow-inner" />
                <textarea placeholder="Pour your heart out here..." rows={4} value={newNote.content} onChange={e => setNewNote({...newNote, content: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none border-b-2 border-gray-100 focus:border-primary outline-none focus:ring-0 font-bold text-gray-800 transition-all resize-none shadow-inner leading-relaxed" />
                
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-primary uppercase px-1 tracking-widest">Theme Color</p>
                  <div className="flex gap-2">
                    {['bg-[#ffb7b2]', 'bg-[#b2e2f2]', 'bg-[#d1e9cf]', 'bg-[#ffccb6]', 'bg-[#fdfd96]'].map(color => (
                      <button key={color} onClick={() => setNewNote({...newNote, color})} className={cn("w-10 h-10 rounded-2xl border-4 transition-all active:scale-90 shadow-md", color, newNote.color === color ? "border-primary scale-110 shadow-lg" : "border-white")} />
                    ))}
                  </div>
                </div>

                {!editingNote && (
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm">
                    <span className="text-sm font-bold text-gray-700">{newNote.is_revealed ? 'Show immediately ⚡' : 'Keep it a secret 🤫'}</span>
                    <button onClick={() => setNewNote({...newNote, is_revealed: !newNote.is_revealed})} className={cn("w-12 h-6 rounded-full relative transition-colors", newNote.is_revealed ? "bg-primary" : "bg-gray-300 shadow-inner")}>
                      <motion.div animate={{ x: newNote.is_revealed ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                    </button>
                  </div>
                )}

                <button onClick={handleAddNote} className="btn-cute bg-primary text-white justify-center py-4 mt-2 shadow-xl shadow-primary/30 font-bold border-b-4 border-primary/40 hover:scale-[1.02]">
                  {editingNote ? 'Update Memory ✨' : 'Send Note 💌'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative z-50">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">Settings <Settings className="text-primary" size={20} /></h2>
              
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold opacity-40 uppercase px-1">Change Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input 
                      type="password" 
                      required
                      placeholder="Current Password" 
                      value={passwordData.current}
                      onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background rounded-2xl border-none font-bold" 
                    />
                  </div>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input 
                      type="password" 
                      required
                      placeholder="New Password" 
                      value={passwordData.new}
                      onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background rounded-2xl border-none font-bold" 
                    />
                  </div>
                </div>

                {settingsMessage.text && (
                  <p className={cn("text-xs font-bold text-center p-3 rounded-xl", settingsMessage.type === 'success' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400")}>
                    {settingsMessage.text}
                  </p>
                )}

                <div className="flex justify-end gap-3 mt-4">
                   <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-6 py-2 rounded-xl border border-gray-100 font-bold text-gray-400">Cancel</button>
                   <button type="submit" className="btn-cute bg-primary text-white py-2 px-6 shadow-lg shadow-primary/20">Update ✨</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
