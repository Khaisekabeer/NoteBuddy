require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const path = require('path');
const db = require('./db');

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

// Socket.io connection
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
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
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

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
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, req.user.id]);
    res.json({ message: 'Password changed successfully! ✨' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- NOTE ROUTES ---

app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT n.*, u.username as author_name 
      FROM notes n
      JOIN users u ON n.author_id = u.id
      WHERE n.author_id = $1 
      OR (n.recipient_id = $2 AND n.is_revealed = true)
      ORDER BY n.created_at DESC
    `, [req.user.id, req.user.id]);

    const decryptedNotes = result.rows.map(n => ({
      ...n,
      title: decrypt(n.title),
      content: decrypt(n.content),
      is_revealed: n.is_revealed ? 1 : 0 // Keep frontend compatibility
    }));

    res.json(decryptedNotes);
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  const { title, content, color, recipient_username, is_revealed } = req.body;
  
  try {
    let recipient_id = null;
    if (recipient_username) {
      const friendResult = await db.query('SELECT id FROM users WHERE username = $1', [recipient_username]);
      if (friendResult.rows[0]) recipient_id = friendResult.rows[0].id;
    }

    const encryptedTitle = encrypt(title);
    const encryptedContent = encrypt(content);

    const result = await db.query(
      'INSERT INTO notes (title, content, color, author_id, recipient_id, is_revealed) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [encryptedTitle, encryptedContent, color || 'bg-[#ffb7b2]', req.user.id, recipient_id, is_revealed ? true : false]
    );
    
    const noteId = result.rows[0].id;

    if (is_revealed && recipient_id) {
      io.to(`user_${recipient_id}`).emit('note_revealed', {
        id: noteId,
        title: title,
        author_id: req.user.id
      });
    }

    res.status(201).json({ id: noteId, title, color, is_revealed });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, color } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM notes WHERE id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can edit' });

    const encryptedTitle = encrypt(title);
    const encryptedContent = encrypt(content);

    await db.query('UPDATE notes SET title = $1, content = $2, color = $3 WHERE id = $4', [encryptedTitle, encryptedContent, color, id]);
    res.json({ message: 'Note updated! ✨' });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/notes/:id/reveal', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM notes WHERE id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can reveal' });

    await db.query('UPDATE notes SET is_revealed = true WHERE id = $1', [id]);

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

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM notes WHERE id = $1', [id]);
    const note = result.rows[0];

    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can delete' });

    await db.query('DELETE FROM notes WHERE id = $1', [id]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

// Initialize DB and start server
db.initDb().then(() => {
  http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
