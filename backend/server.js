require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const path = require('path');
const multer = require('multer');
const { supabase, initDb } = require('./db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});
const PORT = process.env.PORT || 5000;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key';

// Helper: Encrypt
const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

// Helper: Decrypt
const decrypt = (hash) => {
  try {
    const bytes = CryptoJS.AES.decrypt(hash, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return 'Decryption Error';
  }
};

app.use(cors());
app.use(express.json());

// Socket.io connection with Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`Socket connected securely for user: ${socket.user.username}`);
  
  socket.on('join', (userId) => {
    // Ensure clients can only join their own room
    if (String(socket.user.id) === String(userId)) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their secure room`);
    } else {
      console.warn(`Unauthorized room join attempt by user ${socket.user.id} for room ${userId}`);
    }
  });
});

// Middleware: Authenticate User
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verify Error:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for:', username);
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      console.warn('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('Password mismatch for:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', req.user.id);
      
    res.json({ message: 'Password changed successfully! ✨' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- NOTE ROUTES ---

app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { data: notes, error } = await supabase
      .from('notes')
      .select(`
        *,
        author:users!notes_author_id_fkey(username),
        recipient:users!notes_recipient_id_fkey(username)
      `)
      .or(`author_id.eq.${req.user.id},and(recipient_id.eq.${req.user.id},is_revealed.eq.true)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Identify which notes are unseen for the recipient (for frontend calculation)
    const unseenForRecipient = notes.filter(
      n => n.recipient_id === req.user.id && n.is_revealed && !n.is_seen
    );

    const decryptedNotes = notes.map(n => ({
      ...n,
      author_name: n.author?.username,
      recipient_name: n.recipient?.username,
      title: decrypt(n.title),
      content: decrypt(n.content),
      is_revealed: n.is_revealed ? 1 : 0,
      is_seen: unseenForRecipient.some(u => u.id === n.id) ? true : n.is_seen,
      media: n.media || []
    }));

    // Generate temporary signed URLs for all media items
    const notesWithMedia = await Promise.all(decryptedNotes.map(async (n) => {
      const mediaWithUrls = await Promise.all(n.media.map(async (m) => {
        const { data, error } = await supabase.storage
          .from('note-media')
          .createSignedUrl(m.url, 60 * 60);
        return { ...m, signed_url: data?.signedUrl || null };
      }));
      return { ...n, media: mediaWithUrls };
    }));

    res.json(notesWithMedia);
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  const { title, content, color, recipient_username, is_revealed, media } = req.body;
  
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

    // Auto-assign recipient if none provided (for 2-person apps)
    if (!recipient_id) {
       const { data: others } = await supabase
         .from('users')
         .select('id')
         .neq('id', req.user.id)
         .limit(1);
       if (others && others.length > 0) recipient_id = others[0].id;
    }

    console.log(`Creating note for author ${req.user.id} to recipient ${recipient_id}`);

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
});

app.post('/api/upload', authenticateToken, upload.array('media', 5), async (req, res) => {
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
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, color } = req.body;
  
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
        color
      })
      .eq('id', id);

    res.json({ message: 'Note updated! ✨' });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/notes/:id/reveal', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can reveal' });

    await supabase
      .from('notes')
      .update({ is_revealed: true })
      .eq('id', id);

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
});

app.patch('/api/notes/:id/seen', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: note } = await supabase.from('notes').select('*').eq('id', id).single();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    
    // Only recipient can mark as seen
    if (note.recipient_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    if (!note.is_seen) {
      await supabase.from('notes').update({ is_seen: true }).eq('id', id);
      io.to(`user_${note.author_id}`).emit('note_seen', { id: note.id });
    }
    
    res.json({ message: 'Note marked as seen' });
  } catch (err) {
    console.error('Mark seen error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/notes/:id/unreveal', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can unreveal' });

    await supabase
      .from('notes')
      .update({ is_revealed: false, is_seen: false })
      .eq('id', id);

    // Notify recipient that the note was un-revealed (hidden again)
    if (note.recipient_id) {
      io.to(`user_${note.recipient_id}`).emit('note_unrevealed', {
        id: note.id,
        author_id: note.author_id
      });
    }

    res.json({ message: 'Note hidden again 🔒' });
  } catch (err) {
    console.error('Unreveal note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/notes/:id/like', authenticateToken, async (req, res) => {
  const { id } = req.params;
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
});

app.patch('/api/notes/:id/unlike', authenticateToken, async (req, res) => {
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
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can delete' });

    await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

// Initialize DB and start server
initDb().then(() => {
  http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
