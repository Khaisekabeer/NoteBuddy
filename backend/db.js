const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ FATAL: DATABASE_URL is not defined!');
} else {
  try {
    const url = new URL(databaseUrl);
    console.log(`📡 Connecting to database: ${url.hostname}`);
  } catch (e) {
    console.error('❌ FATAL: Invalid DATABASE_URL format!');
  }
}

// Optimized for Supabase Pooler on Render
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  try {
    console.log('⏳ Initializing database tables...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connection to pool established!');
    client.release();

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
    console.error('👉 Internal code:', err.code);
    throw err;
  }
};

module.exports = {
  query,
  initDb,
  pool
};
