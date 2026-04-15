require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser() {
  const username = 'testuser_senior';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
    if (existing) {
      console.log('Test user already exists.');
      return;
    }

    const { data, error } = await supabase.from('users').insert({
      username,
      password: hashedPassword
    }).select().single();

    if (error) throw error;
    console.log('Created test user:', data.username);
  } catch (err) {
    console.error('Error creating test user:', err);
  }
}

createTestUser();
