require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  try {
    const { data, error } = await supabase.from('users').select('id, username').limit(5);
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    console.log('Existing users:', data);
  } catch (err) {
    console.error('Execution error:', err);
  }
}

checkUsers();
