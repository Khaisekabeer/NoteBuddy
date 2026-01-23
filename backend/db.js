const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://udlshxcrghonvjygwbdd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ FATAL: SUPABASE_ANON_KEY is not defined!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`📡 Connecting to Supabase: ${supabaseUrl}`);

const initDb = async () => {
  try {
    console.log('⏳ Initializing database...');
    
    // Seed users
    const users = [
      { username: 'khai', password: '123' },
      { username: 'bestie', password: '123' }
    ];

    for (const u of users) {
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('username', u.username)
        .maybeSingle();
      
      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const { error } = await supabase.from('users').insert({
          username: u.username,
          password: hashedPassword
        });
        if (error) throw error;
        console.log(`✅ User ${u.username} seeded!`);
      }
    }
    
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
