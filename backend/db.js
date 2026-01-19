const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'notebuddy.db'), { verbose: console.log });

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    color TEXT DEFAULT 'bg-[#ffb7b2]',
    author_id INTEGER NOT NULL,
    recipient_id INTEGER,
    is_revealed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users (id),
    FOREIGN KEY (recipient_id) REFERENCES users (id)
  );
`);

// Seed default users if they don't exist
const bcrypt = require('bcryptjs');
const seedUsers = () => {
  const users = [
    { username: 'khai', password: '123' },
    { username: 'bestie', password: '123' }
  ];

  const checkUser = db.prepare('SELECT * FROM users WHERE username = ?');
  const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');

  users.forEach(u => {
    const existing = checkUser.get(u.username);
    if (!existing) {
      const hashedPassword = bcrypt.hashSync(u.password, 10);
      insertUser.run(u.username, hashedPassword);
      console.log(`User ${u.username} seeded!`);
    }
  });
};

seedUsers();

module.exports = db;
