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
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(401).json({ message: 'Current password incorrect' });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNewPassword, req.user.id);
  res.json({ message: 'Password changed successfully! ✨' });
});

// --- NOTE ROUTES ---

app.get('/api/notes', authenticateToken, (req, res) => {
  const notes = db.prepare(`
    SELECT n.*, u.username as author_name 
    FROM notes n
    JOIN users u ON n.author_id = u.id
    WHERE n.author_id = ? 
    OR (n.recipient_id = ? AND n.is_revealed = 1)
    ORDER BY n.created_at DESC
  `).all(req.user.id, req.user.id);

  const decryptedNotes = notes.map(n => ({
    ...n,
    title: decrypt(n.title),
    content: decrypt(n.content)
  }));

  res.json(decryptedNotes);
});

app.post('/api/notes', authenticateToken, (req, res) => {
  const { title, content, color, recipient_username, is_revealed } = req.body;
  
  let recipient_id = null;
  if (recipient_username) {
    const friend = db.prepare('SELECT id FROM users WHERE username = ?').get(recipient_username);
    if (friend) recipient_id = friend.id;
  }

  const encryptedTitle = encrypt(title);
  const encryptedContent = encrypt(content);

  const stmt = db.prepare('INSERT INTO notes (title, content, color, author_id, recipient_id, is_revealed) VALUES (?, ?, ?, ?, ?, ?)');
  const info = stmt.run(encryptedTitle, encryptedContent, color || 'bg-[#ffb7b2]', req.user.id, recipient_id, is_revealed ? 1 : 0);
  
  if (is_revealed && recipient_id) {
    io.to(`user_${recipient_id}`).emit('note_revealed', {
      id: info.lastInsertRowid,
      title: title,
      author_id: req.user.id
    });
  }

  res.status(201).json({ id: info.lastInsertRowid, title, color, is_revealed });
});

app.put('/api/notes/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, content, color } = req.body;
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can edit' });

  const encryptedTitle = encrypt(title);
  const encryptedContent = encrypt(content);

  db.prepare('UPDATE notes SET title = ?, content = ?, color = ? WHERE id = ?').run(encryptedTitle, encryptedContent, color, id);
  res.json({ message: 'Note updated! ✨' });
});

app.patch('/api/notes/:id/reveal', authenticateToken, (req, res) => {
  const { id } = req.params;
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can reveal' });

  db.prepare('UPDATE notes SET is_revealed = 1 WHERE id = ?').run(id);

  if (note.recipient_id) {
    io.to(`user_${note.recipient_id}`).emit('note_revealed', {
      id: note.id,
      title: decrypt(note.title),
      author_id: note.author_id
    });
  }

  res.json({ message: 'Note revealed! 🎉' });
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (note.author_id !== req.user.id) return res.status(403).json({ message: 'Only author can delete' });

  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  res.json({ message: 'Note deleted' });
});

app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
