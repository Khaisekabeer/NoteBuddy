const { Pool } = require('pg');

// Debugging: Log connection presence (not the full string for security)
if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL is not defined in environment variables!');
} else {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`📡 Attempting to connect to database at: ${url.hostname}`);
  } catch (e) {
    console.error('❌ FATAL: DATABASE_URL is not a valid URL format!');
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  try {
    console.log('⏳ Initializing database tables...');
    // Create Tables
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        color TEXT DEFAULT 'bg-[#ffb7b2]',
        author_id INTEGER NOT NULL REFERENCES users(id),
        recipient_id INTEGER REFERENCES users(id),
        is_revealed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default users
    const bcrypt = require('bcryptjs');
    const users = [
      { username: 'khai', password: '123' },
      { username: 'bestie', password: '123' }
    ];

    for (const u of users) {
      const existing = await query('SELECT * FROM users WHERE username = $1', [u.username]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await query('INSERT INTO users (username, password) VALUES ($1, $2)', [u.username, hashedPassword]);
        console.log(`✅ User ${u.username} seeded!`);
      }
    }
    console.log('🚀 Database initialized successfully!');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    if (err.message.includes('ENOTFOUND')) {
      console.error('👉 Hint: The database hostname could not be found. Check if your DATABASE_URL is correct and has no typos.');
    }
    throw err; // Re-throw to catch it in server.js
  }
};

module.exports = {
  query,
  initDb,
  pool
};
