import React, { useState, useEffect } from 'react'
import { Plus, Search, Heart, User, Users, StickyNote, Eye, Lock, Unlock, Sparkles, Send, Trash2, LogOut, Settings, Key, ShieldCheck, Edit2, WifiOff, CloudUpload, ImagePlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import confetti from 'canvas-confetti'
import knotImg from './assets/knot_transparent.png'
import ribbonImg from './assets/ribbon.png'
import { api } from './services/api'
import { io } from 'socket.io-client'
import FloatingHearts from './components/FloatingHearts'
import InaugurationCeremony from './components/InaugurationCeremony'
import AuthScreen from './components/AuthScreen'
import NoteCard from './components/NoteCard'
import { Toaster, toast } from 'react-hot-toast'


// Initialize socket without auto-connecting yet
const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
  autoConnect: false
});

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const [view, setView] = useState('mine')
  const [notes, setNotes] = useState([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [noteToDelete, setNoteToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newNote, setNewNote] = useState(() => {
    try {
      const saved = localStorage.getItem('notebuddy_unsaved_note');
      return saved ? JSON.parse(saved) : { title: '', content: '', color: 'bg-[#ffb7b2]', is_revealed: false, recipient_username: '' };
    } catch {
      return { title: '', content: '', color: 'bg-[#ffb7b2]', is_revealed: false, recipient_username: '' };
    }
  })
  const [mediaFiles, setMediaFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '' })
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' })
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notebuddy_drafts') || '[]'); } catch { return []; }
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isInaugurated, setIsInaugurated] = useState(() => {
    return localStorage.getItem('inaugurated') === 'true';
  });
  const [showJarMessage, setShowJarMessage] = useState(false);

  const handleInaugurationComplete = () => {
    localStorage.setItem('inaugurated', 'true');
    setIsInaugurated(true);
  };

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
      // 🚀 PERFORMANCE FIX: Fetch notes immediately if we have a token (Parallel fetching)
      fetchNotes(token);
    } else {
      setIsLoading(false);
    }
  }, []);



  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Persist user to localStorage for offline awareness
      localStorage.setItem('notebuddy_user', JSON.stringify(currentUser));

      const token = localStorage.getItem('token');
      if (token) {
        socket.auth = { token };
        socket.connect();
      }

      // Note: fetchNotes is now also called on initial mount in the first useEffect, 
      // but we keep a call here in case of dynamic user switching.
      fetchNotes();
      
      socket.emit('join', currentUser.id);

      const handleNoteRevealed = () => { 
        fetchNotes(); 
        triggerConfetti(); 
        toast.success(`A memory was revealed! 💖`, { style: { borderRadius: '1rem', background: '#ffb7b2', color: '#fff', fontWeight: 'bold' }, iconTheme: { primary: '#fff', secondary: '#ffb7b2' } });
      };
      const handleNoteUnrevealed = () => { fetchNotes(); };
      const handleNoteSeen = () => { fetchNotes(); };
      const handleNoteLiked = () => { 
        fetchNotes(); 
        toast.success('Your memory got a heart! ❤️', { style: { borderRadius: '1rem', background: '#ffe4e1', color: '#ff69b4', fontWeight: 'bold' }, iconTheme: { primary: '#ff69b4', secondary: '#fff' } });
      };

      socket.on('note_revealed', handleNoteRevealed);
      socket.on('note_unrevealed', handleNoteUnrevealed);
      socket.on('note_seen', handleNoteSeen);
      socket.on('note_liked', handleNoteLiked);
      
      return () => {
        socket.off('note_revealed', handleNoteRevealed);
        socket.off('note_unrevealed', handleNoteUnrevealed);
        socket.off('note_seen', handleNoteSeen);
        socket.off('note_liked', handleNoteLiked);
        socket.disconnect();
      };
    }
  }, [currentUser]);

  // AUTO-SAVE: Save the current newNote state to localStorage whenever it changes
  useEffect(() => {
    if (!editingNote && (newNote.title || newNote.content || newNote.recipient_username)) {
      localStorage.setItem('notebuddy_unsaved_note', JSON.stringify(newNote));
    }
  }, [newNote, editingNote]);


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

  const fetchNotes = async (optionalToken) => {
    // Pass the token explicitly if provided (useful for initial parallel load before api service has it)
    const data = await api.getNotes(optionalToken);
    if (Array.isArray(data)) {
      setNotes(data);
    }
  };

    const handleSeen = async (id) => {
      const note = notes.find(n => n.id === id);
      if (note && String(note.author_id) !== String(currentUser.id) && note.is_revealed && !note.is_seen) {
        // Optimistically complete to make red dot disappear instantly
        setNotes(prev => prev.map(n => n.id === id ? { ...n, is_seen: true } : n));
        await api.markAsSeen(id);
        // We don't strictly need fetchNotes() here immediately as optimistic update handles it visually
        // but it's good to ensure sync eventually.
        fetchNotes();
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
    if (!newNote.title || (!newNote.content && !mediaFile)) return;

    // Offline? Save as draft instead
    if (!isOnline && !editingNote) {
      if (mediaFiles.length > 0) {
        alert("You must be online to attach photos or videos.");
        return; 
      }
      const draft = { ...newNote, id: `draft_${Date.now()}`, isDraft: true, created_at: new Date().toISOString() };
      const updated = [...drafts, draft];
      setDrafts(updated);
      localStorage.setItem('notebuddy_drafts', JSON.stringify(updated));
      setIsAdding(false);
      setNewNote({ title: '', content: '', color: 'bg-[#ffb7b2]', is_revealed: false, recipient_username: '' });
      setMediaFiles([]);
      return;
    }

    setIsUploading(true);
    let uploadedMediaList = [];
    try {
      // Filter existing files (which already have URLs) vs new files (which are File objects)
      const existingMedia = mediaFiles.filter(f => f.isExisting).map(({ isExisting, signed_url, ...m }) => m);
      const newFiles = mediaFiles.filter(f => !f.isExisting);

      if (newFiles.length > 0) {
        const uploadResult = await api.uploadMedia(newFiles);
        uploadedMediaList = [...existingMedia, ...uploadResult.files];
      } else {
        uploadedMediaList = existingMedia;
      }

      const notePayload = {
        ...newNote,
        media: uploadedMediaList
      };

      if (editingNote) {
        await api.updateNote(editingNote.id, notePayload);
      } else {
        await api.createNote(notePayload);
      }
      
      setIsAdding(false);
      setEditingNote(null);
      setNewNote({ title: '', content: '', color: 'bg-[#ffb7b2]', is_revealed: false, recipient_username: '' });
      localStorage.removeItem('notebuddy_unsaved_note');
      setMediaFiles([]);
      fetchNotes();
      
      if (!editingNote) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: [newNote.color.replace('bg-[', '').replace(']', '')]
        });
      }
    } catch (err) {
      const errorMsg = err.message || "Failed to save note";
      const errorDetail = err.detail ? ` (${err.detail})` : "";
      alert(`${errorMsg}${errorDetail}`);
    } finally {
      setIsUploading(false);
    }
  }

  const handleEdit = (note) => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      color: note.color,
      is_revealed: !!note.is_revealed,
      recipient_username: note.recipient_name || ''
    });
    // Load existing media into mediaFiles state for editing/deletion
    if (note.media && note.media.length > 0) {
      setMediaFiles(note.media.map(m => ({ ...m, isExisting: true })));
    } else {
      setMediaFiles([]);
    }
    setIsAdding(true);
  }

  const handleReveal = async (id) => {
    await api.revealNote(id);
    fetchNotes();
    triggerConfetti();
  }

  const handleUnreveal = async (id) => {
    await api.unrevealNote(id);
    fetchNotes();
  }

  const handleLike = async (id) => {
    await api.likeNote(id);
    fetchNotes();
  }

  const handleUnlike = async (id) => {
    await api.unlikeNote(id);
    fetchNotes();
  }

  const syncDrafts = async () => {
    if (!drafts.length || isSyncing) return;
    setIsSyncing(true);
    try {
      for (const draft of drafts) {
        const { isDraft, id, created_at, ...noteData } = draft;
        // Backend now handles auto-assigning recipient if none provided
        await api.createNote(noteData);
      }
      setDrafts([]);
      localStorage.removeItem('notebuddy_drafts');
      fetchNotes();
      triggerConfetti();
    } finally {
      setIsSyncing(false);
    }
  }

  const handleDelete = async (id) => {
    await api.deleteNote(id);
    setNoteToDelete(null);
    fetchNotes();
  }

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center font-bold text-primary">Loading...</div>;

  if (!isInaugurated) return <InaugurationCeremony onComplete={handleInaugurationComplete} />;

  if (!currentUser) {
    // Try to restore user from localStorage for offline hint (still show login)
    return <AuthScreen onLogin={(user) => { localStorage.setItem('notebuddy_user', JSON.stringify(user)); setCurrentUser(user); }} />;
  }

  const filteredNotes = notes.filter(n => {
    const dateStr = new Date(n.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dateStr.toLowerCase().includes(searchTerm.toLowerCase());
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
      <Toaster position="top-center" />
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
              {notes.some(n => String(n.author_id) !== String(currentUser.id) && !!n.is_revealed && !n.is_seen) && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white animate-ping" />
              )}
            </div>
            <span className="hidden md:inline text-sm uppercase tracking-widest px-2">
              Bestie's Stories
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
                animate={{ width: `${Math.min((notes.filter(n => !!n.is_revealed).length / 1000) * 100, 100)}%` }}
                className="h-full bg-gradient-to-r from-primary to-secondary"
              />
           </div>
           <p className="text-[10px] font-bold text-gray-400 text-center">
             {notes.filter(n => !!n.is_revealed).length} shared memories so far... 💖
           </p>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 pb-32 md:pb-12 overflow-y-auto relative z-10">

        {/* Offline Banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 text-amber-800 rounded-2xl px-5 py-3 mb-6 font-black text-sm shadow-sm"
            >
              <WifiOff size={18} className="text-amber-500 shrink-0" />
              <span>You're offline — notes will be saved as drafts 📝</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync Drafts Banner */}
        <AnimatePresence>
          {isOnline && drafts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-between gap-3 bg-blue-50 border-2 border-blue-200 text-blue-800 rounded-2xl px-5 py-3 mb-6 font-black text-sm shadow-sm"
            >
              <span>📬 {drafts.length} draft{drafts.length > 1 ? 's' : ''} waiting to be sent!</span>
              <button
                onClick={syncDrafts}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
              >
                <CloudUpload size={14} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
             <div className="flex gap-2 items-center">
                {/* Mobile Memory Jar */}
                <div className="relative group cursor-pointer flex flex-col items-center" onClick={() => { setShowJarMessage(true); setTimeout(() => setShowJarMessage(false), 3000); }}>
                   {/* Custom CSS Jar */}
                   <div className="flex flex-col items-center mb-0.5">
                      {/* Lid */}
                      <div className="w-4 h-1 bg-gray-300 rounded-sm border border-gray-400/50 shadow-sm z-20" />
                      {/* Body */}
                      <div className="w-6 h-7 bg-white/40 backdrop-blur-sm border-2 border-gray-400/40 border-t-0 rounded-b-lg relative overflow-hidden shadow-inner">
                         {/* Liquid */}
                         <motion.div 
                           className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/60 w-full"
                           initial={{ height: 0 }}
                           animate={{ height: `${Math.min((notes.filter(n => !!n.is_revealed).length / 1000) * 100, 100)}%` }}
                           transition={{ type: "spring", stiffness: 50, damping: 20 }}
                         />
                         {/* Glass Shine */}
                         <div className="absolute top-1 left-0.5 w-0.5 h-4 bg-white/40 rounded-full z-10" />
                      </div>
                   </div>
                   
                   <span className="text-[8px] font-bold text-gray-400 leading-none">Memory Jar</span>

                   <AnimatePresence>
                     {showJarMessage && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10, scale: 0.8 }} 
                         animate={{ opacity: 1, y: 0, scale: 1 }} 
                         exit={{ opacity: 0, scale: 0.8 }} 
                         className="absolute top-12 right-0 bg-primary text-white text-[10px] font-black p-2 rounded-xl w-32 shadow-2xl z-50 text-center border-2 border-white"
                       >
                         Oh no! It fills till infinity! ♾️
                         <div className="absolute -top-1 right-4 w-2 h-2 bg-primary rotate-45 border-l-2 border-t-2 border-white" />
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>

                <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-primary/10 text-primary rounded-xl"><Settings size={18} /></button>
                <button onClick={handleLogout} className="p-2 bg-red-50 text-red-400 rounded-xl"><LogOut size={18} /></button>
             </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-1">Our Note corner 💖</h2>
            <p className="text-sm md:text-base font-medium text-gray-500">uhmmmm.. one note at a time.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 shadow-xl rounded-2xl border-2 border-white/50">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search memories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm rounded-2xl border-none outline-none font-bold text-gray-800" />
            </div>
            <button onClick={() => { setEditingNote(null); setIsAdding(true); }} className="hidden md:flex btn-cute bg-primary text-white hover:bg-primary/90 shadow-xl">
              <Plus size={24} /> <span>Write  Note</span>
            </button>
          </div>
        </header>

        {/* Offline Drafts Section */}
        <AnimatePresence>
          {drafts.length > 0 && view === 'mine' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3 px-1 flex items-center gap-2">
                <WifiOff size={12} /> Offline Drafts ({drafts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {drafts.map(draft => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    className={`${draft.color} rounded-3xl p-5 min-h-[180px] flex flex-col justify-between border-2 border-dashed border-amber-400 relative`}
                  >
                    <div>
                      <h4 className="font-extrabold text-base text-gray-800 mb-2">{draft.title}</h4>
                      <p className="text-sm text-gray-700 font-bold">{draft.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-full">📝 Draft — not sent</span>
                      <button
                        onClick={() => {
                          const updated = drafts.filter(d => d.id !== draft.id);
                          setDrafts(updated);
                          localStorage.setItem('notebuddy_drafts', JSON.stringify(updated));
                        }}
                        className="p-1.5 bg-white/60 hover:bg-white rounded-full text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode='popLayout'>
            {filteredNotes.map(note => <NoteCard key={note.id} note={note} onReveal={handleReveal} onUnreveal={handleUnreveal} onLike={handleLike} onUnlike={handleUnlike} onSeen={handleSeen} currentUser={currentUser} onDelete={(id) => setNoteToDelete(id)} onEdit={handleEdit} />)}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setEditingNote(null); setMediaFiles([]); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-50 border-2 border-primary/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-primary">
                {editingNote ? 'Edit Note' : 'Write a Note'} <Heart className="text-primary" size={20} fill="currentColor" />
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
                
                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-primary/30 rounded-2xl cursor-pointer hover:bg-primary/5 transition-colors group">
                    <ImagePlus className="text-secondary group-hover:text-primary transition-colors" size={20} />
                    <span className="text-xs font-bold text-gray-500 group-hover:text-primary transition-colors">
                      {editingNote?.media?.length > 0 ? 'Add more media' : 'Attach Photos/Videos'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*,video/*,.heic,.HEIC,.heif,.HEIF,.jpg,.jpeg,.JPG,.JPEG,.png,.PNG" 
                      multiple
                      className="hidden" 
                      onChange={(e) => setMediaFiles([...mediaFiles, ...Array.from(e.target.files)])}
                    />
                  </label>

                  {mediaFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 max-h-32 overflow-y-auto">
                      {mediaFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                          {file.isExisting ? (
                            <span className="text-[10px] font-bold text-primary truncate max-w-[100px]">Existing Memory {idx + 1}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-600 truncate max-w-[100px]">{file.name}</span>
                          )}
                          <button 
                            onClick={() => setMediaFiles(mediaFiles.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-primary uppercase px-1 tracking-widest">Theme Color</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      'bg-[#ffb7b2]', 'bg-[#b2e2f2]', 'bg-[#d1e9cf]', 'bg-[#ffccb6]', 'bg-[#fdfd96]',
                      'bg-gradient-to-br from-pink-200 to-rose-300', 
                      'bg-gradient-to-br from-blue-200 to-indigo-300', 
                      'bg-gradient-to-br from-emerald-200 to-teal-300',
                      'bg-gradient-to-br from-amber-200 to-orange-300',
                      'bg-gradient-to-br from-purple-200 to-fuchsia-300'
                    ].map(color => (
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

                <button onClick={handleAddNote} disabled={isUploading} className="btn-cute bg-primary text-white justify-center py-4 mt-2 shadow-xl shadow-primary/30 font-bold border-b-4 border-primary/40 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100">
                  {isUploading ? 'Uploading & Saving... ⏳' : (editingNote ? 'Update Memory ✨' : 'Send Note 💌')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNoteToDelete(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative z-50 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Delete this memory?</h2>
              <p className="text-sm text-gray-400 font-bold mb-6">This can't be undone. 💔</p>
              <div className="flex gap-3">
                <button onClick={() => setNoteToDelete(null)} className="flex-1 py-3 rounded-2xl border-2 border-gray-100 font-black text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={() => handleDelete(noteToDelete)} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-200">Delete 🗑️</button>
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
