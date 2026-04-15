import { useEffect } from 'react';
import { socket } from '../services/socket';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  const end = Date.now() + 2 * 1000;
  const colors = ['#ffb7b2', '#b2e2f2', '#d1e9cf', '#ffccb6', '#fdfd96'];
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
};

export const useSockets = (currentUser, fetchNotes) => {
  useEffect(() => {
    if (!currentUser) return;
    
    const token = localStorage.getItem('token');
    if (token) {
      socket.auth = { token };
      socket.connect();
    }

    socket.emit('join', currentUser.id);

    const handleNoteRevealed = () => { 
      fetchNotes(); 
      triggerConfetti(); 
      toast.success(`A memory was revealed! 💖`, { style: { borderRadius: '1rem', background: '#ffb7b2', color: '#fff', fontWeight: 'bold' }, iconTheme: { primary: '#fff', secondary: '#ffb7b2' } });
    };
    const handleNoteUnrevealed = () => fetchNotes();
    const handleNoteSeen = () => fetchNotes();
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
  }, [currentUser, fetchNotes]);

  return { socket };
};
