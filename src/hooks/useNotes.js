import { useState, useCallback } from 'react';
import { api } from '../services/api';

export const useNotes = () => {
  const [notes, setNotes] = useState([]);
  
  const fetchNotes = useCallback(async (optionalToken) => {
    const data = await api.getNotes(optionalToken);
    if (Array.isArray(data)) setNotes(data);
  }, []);

  const markAsSeenOptimistic = async (id, currentUser) => {
    const note = notes.find(n => n.id === id);
    if (note && String(note.author_id) !== String(currentUser.id) && note.is_revealed && !note.is_seen) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, is_seen: true } : n));
      await api.markAsSeen(id);
      fetchNotes();
    }
  };

  return { notes, setNotes, fetchNotes, markAsSeenOptimistic };
};
