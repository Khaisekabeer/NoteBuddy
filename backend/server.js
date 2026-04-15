require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/config/db');
const { socketAuthMiddleware } = require('./src/middleware/auth.middleware');

const authRoutes = require('./src/routes/auth.routes');
const notesRoutes = require('./src/routes/notes.routes');
const uploadRoutes = require('./src/routes/upload.routes');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});
const PORT = process.env.PORT || 5000;

app.set('io', io);

app.use(cors());
app.use(express.json());

// Socket.io connection with Authentication Middleware
io.use(socketAuthMiddleware);

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

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/upload', uploadRoutes);

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
