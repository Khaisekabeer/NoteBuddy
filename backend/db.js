const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ FATAL: DATABASE_URL is not defined!');
} else {
  try {
    const url = new URL(databaseUrl);
    console.log(`📡 Connecting to database: ${url.hostname}`);
    if (url.hostname.includes('supabase.co') && !url.hostname.includes('pooler')) {
        console.warn('⚠️ WARNING: You are using a direct Supabase URL. This often fails on Render with ENETUNREACH.');
        console.warn('👉 PLEASE USE THE POOLER URL INSTEAD: aws-0-ap-southeast-1.pooler.supabase.com');
    }
  } catch (e) {
    console.error('❌ FATAL: Invalid DATABASE_URL format!');
  }
}

// Optimized for Render (IPv4 only)
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // Force IPv4 if the hostname resolves to both
  family: 4, 
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  try {
    console.log('⏳ Initializing database tables...');
    
    // Attempt to connect
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
    console.error('👉 Error Code:', err.code);
    if (err.code === 'ENETUNREACH') {
        console.error('💡 TIP: This is a network error. You MUST use the IPv4 Pooler URL in Render dashboard.');
    }
    throw err;
  }
};

module.exports = {
  query,
  initDb,
  pool
};
