const { Pool } = require('pg');
const dns = require('dns');
const util = require('util');

const resolve4 = util.promisify(dns.resolve4);

const initDb = async () => {
  try {
    console.log('⏳ Initializing database...');
    
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        throw new Error('DATABASE_URL is missing!');
    }

    // Parse the URL
    const url = new URL(connectionString);
    const originalHost = url.hostname;
    
    console.log(`� Resolving IPv4 for: ${originalHost}`);
    
    try {
        // FORCE IPv4 Resolution
        const addresses = await resolve4(originalHost);
        if (addresses && addresses.length > 0) {
            const ip = addresses[0];
            console.log(`✅ Found IPv4: ${ip}`);
            // Replace hostname with IP in the host property, but keep original for SNI if needed
            url.hostname = ip;
            connectionString = url.toString();
        }
    } catch (dnsErr) {
        console.warn(`⚠️ Could not resolve IPv4 for ${originalHost}, sticking with original host.`);
        console.warn(dnsErr.message);
    }

    const pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
    });

    const query = (text, params) => pool.query(text, params);
    
    // Explicitly test connectivity
    const client = await pool.connect();
    console.log(`✅ Connected successfully to ${originalHost} (via IPv4)!`);
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
    
    // Assign query to module.exports for the server to use
    module.exports.query = query;
    module.exports.pool = pool; // Export pool if needed

  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    throw err;
  }
};

// Export a temporary query function that waits for init
let pool;
const queryProxy = async (text, params) => {
    if (!pool) {
         // Fallback just in case initDb hasn't finished (shouldn't happen with await in server.js)
         const { Pool } = require('pg');
         pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    }
    return pool.query(text, params);
};

module.exports = {
  query: queryProxy,
  initDb
};
