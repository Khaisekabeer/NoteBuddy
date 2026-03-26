const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://udlshxcrghonvjygwbdd.supabase.co';
// 🛡️ Use Service Role Key for backend bypass of RLS, fallback to anon key for local dev if needed
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ FATAL: SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) is not defined!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`📡 Connecting to Supabase: ${supabaseUrl} (Using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'})`);

const initDb = async () => {
  try {
    console.log('⏳ Initializing database...');
    
    // No longer seeding users here to allow dynamic renames in Supabase
    
    console.log('🚀 Database initialized successfully!');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    console.error('👉 Make sure you ran the supabase_setup.sql in your Supabase SQL Editor!');
    throw err;
  }
};

module.exports = {
  supabase,
  initDb
};
