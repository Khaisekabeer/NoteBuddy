const { supabase } = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

exports.getNotes = async (req, res) => {
  try {
    const { data: notes, error } = await supabase
      .from('notes')
      .select(`*, author:users!notes_author_id_fkey(username), recipient:users!notes_recipient_id_fkey(username)`)
      .or(`author_id.eq.${req.user.id},and(recipient_id.eq.${req.user.id},is_revealed.eq.true)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const decryptedNotes = notes.map(n => ({
      ...n,
      author_name: n.author?.username,
      recipient_name: n.recipient?.username,
      title: decrypt(n.title),
      content: decrypt(n.content),
      is_revealed: !!n.is_revealed,
      is_seen: !!n.is_seen,
      media: n.media || []
    }));

    const mediaPaths = [];
    decryptedNotes.forEach(n => {
      if (n.media && n.media.length > 0) {
        n.media.forEach(m => {
          if (m.url) mediaPaths.push(m.url);
        });
      }
    });

    const uniquePaths = [...new Set(mediaPaths)];
    let signedUrlsMap = {};

    if (uniquePaths.length > 0) {
      const { data: signedUrlsData, error: urlError } = await supabase.storage
        .from('note-media')
        .createSignedUrls(uniquePaths, 60 * 60);

      if (!urlError && signedUrlsData) {
        signedUrlsData.forEach(item => {
          if (item.signedUrl) {
            signedUrlsMap[item.path] = item.signedUrl;
          }
        });
      } else if (urlError) {
        console.error('Bulk generate signed URLs error:', urlError);
      }
    }

    const notesWithMedia = decryptedNotes.map(n => {
      const mediaWithUrls = n.media.map(m => ({
        ...m,
        signed_url: signedUrlsMap[m.url] || null
      }));
      return { ...n, media: mediaWithUrls };
    });

    res.json(notesWithMedia);
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createNote = async (req, res) => {
  const { title, content, color, recipient_username, is_revealed, media } = req.body;
  const io = req.app.get('io');
  
  try {
    let recipient_id = null;
    if (recipient_username) {
      const { data: friend } = await supabase
        .from('users')
        .select('id')
        .eq('username', recipient_username)
        .maybeSingle();
      if (friend) recipient_id = friend.id;
    }

    if (!recipient_id) {
       const { data: others } = await supabase
         .from('users')
         .select('id')
         .neq('id', req.user.id)
         .limit(1);
       if (others && others.length > 0) recipient_id = others[0].id;
    }

    const encryptedTitle = encrypt(title);
    const encryptedContent = encrypt(content);

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        title: encryptedTitle,
        content: encryptedContent,
        color: color || 'bg-[#ffb7b2]',
        author_id: req.user.id,
        recipient_id,
        is_revealed: is_revealed || false,
        media: media || []
      })
      .select()
      .single();

    if (error) throw error;

    if (is_revealed && recipient_id) {
      io.to(`user_${recipient_id}`).emit('note_revealed', {
        id: note.id,
        title: title,
        author_id: req.user.id
      });
    }

    res.status(201).json({ id: note.id, title, color, is_revealed });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
    
    const uploadResults = await Promise.all(req.files.map(async (file) => {
      const fileExt = file.originalname.split('.').pop() || 'tmp';
      const fileName = `${req.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('note-media')
        .upload(fileName, file.buffer, { 
          contentType: file.mimetype,
          upsert: false
        });
        
      if (error) throw error;
      return { url: fileName, type: file.mimetype };
    }));
    
    res.json({ files: uploadResults });
  } catch (err) {
    console.error('Media upload error detail:', err);
    res.status(500).json({ 
      message: 'Media upload failed', 
      error: err.message,
      detail: err.error || err.code || null
    });
  }
};

exports.updateNote = async (req, res) => {
  const { id } = req.params;
  const { title, content, color, media } = req.body;
  
  try {
    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can edit' });

    const encryptedTitle = encrypt(title);
    const encryptedContent = encrypt(content);

    await supabase
      .from('notes')
      .update({
        title: encryptedTitle,
        content: encryptedContent,
        color,
        media: media || []
      })
      .eq('id', id);

    res.json({ message: 'Note updated! ✨' });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.revealNote = async (req, res) => {
  const { id } = req.params;
  const io = req.app.get('io');
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can reveal' });

    await supabase.from('notes').update({ is_revealed: true }).eq('id', id);

    if (note.recipient_id) {
      io.to(`user_${note.recipient_id}`).emit('note_revealed', {
        id: note.id,
        title: decrypt(note.title),
        author_id: note.author_id
      });
    }
    res.json({ message: 'Note revealed! 🎉' });
  } catch (err) {
    console.error('Reveal note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAsSeen = async (req, res) => {
  const { id } = req.params;
  const io = req.app.get('io');
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    
    if (String(note.author_id) === String(req.user.id)) return res.status(403).json({ message: 'Unauthorized' });

    if (!note.is_seen) {
      await supabase.from('notes').update({ is_seen: true }).eq('id', id);
      io.to(`user_${note.author_id}`).emit('note_seen', { id: note.id });
    }
    res.json({ message: 'Note marked as seen' });
  } catch (err) {
    console.error('Mark seen error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unrevealNote = async (req, res) => {
  const { id } = req.params;
  const io = req.app.get('io');
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can unreveal' });

    await supabase.from('notes').update({ is_revealed: false, is_seen: false }).eq('id', id);

    if (note.recipient_id) {
      io.to(`user_${note.recipient_id}`).emit('note_unrevealed', { id: note.id, author_id: note.author_id });
    }
    res.json({ message: 'Note hidden again 🔒' });
  } catch (err) {
    console.error('Unreveal note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.likeNote = async (req, res) => {
  const { id } = req.params;
  const io = req.app.get('io');
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.recipient_id !== req.user.id) return res.status(403).json({ message: 'Only recipient can like' });

    await supabase.from('notes').update({ is_liked: true }).eq('id', id);
    io.to(`user_${note.author_id}`).emit('note_liked', { id: note.id });
    res.json({ message: 'Note liked! ❤️' });
  } catch (err) {
    console.error('Like note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unlikeNote = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.recipient_id !== req.user.id) return res.status(403).json({ message: 'Only recipient can unlike' });

    await supabase.from('notes').update({ is_liked: false }).eq('id', id);
    res.json({ message: 'Note unliked' });
  } catch (err) {
    console.error('Unlike note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteNote = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can delete' });

    await supabase.from('notes').delete().eq('id', id);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
