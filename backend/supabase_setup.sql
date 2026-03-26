-- Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/udlshxcrghonvjygwbdd/sql/new

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notes table  
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'bg-[#ffb7b2]',
  author_id BIGINT NOT NULL REFERENCES users(id),
  recipient_id BIGINT REFERENCES users(id),
  is_revealed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 🛡️ SECURITY UPDATE: Restrict anonymous access. 
-- Since we use a custom Node.js backend with its own JWT, 
-- we only want the backend (using the Service Role key or Authenticated role if properly configured) to access data.
-- The 'anon' role (public website users) should NOT have direct DB access.

-- Drop old permissive policies (if they exist)
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on notes" ON notes;

-- Create policies that ONLY allow the Supabase 'service_role' (your backend admin)
-- Note: To fully secure this, ensure your backend uses the SERVICE_ROLE_KEY, 
-- or stick to ANON key but we must then rely on the Node backend not exposing the Anon key to the frontend.
-- Right now, since the Node backend does the data fetching, we can restrict to 'authenticated' or 'service_role'.
-- The simplest strict security for a custom Node backend is to deny 'anon' access.

CREATE POLICY "Allow Service Role to manage users" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow Service Role to manage notes" ON notes FOR ALL USING (auth.role() = 'service_role');

-- If your backend uses the ANON key (which it currently does based on db.js), 
-- and you don't want to change to the Service Key yet, you can restrict by IP or remove direct RLS 
-- if all requests go exclusively through your Node.js server. 
-- For a Node.js middleware architecture, the safest route is:
-- 1. Node.js uses SERVICE_ROLE_KEY.
-- 2. Frontend ONLY talks to Node.js (never direct to Supabase).
-- 3. RLS blocks all 'anon' requests.

-- ==========================================
-- =        PHASE 3: MEDIA SUPPORT          =
-- ==========================================

-- 1. Update notes table: Replace single columns with a JSONB array
ALTER TABLE notes 
DROP COLUMN IF EXISTS media_url,
DROP COLUMN IF EXISTS media_type,
ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- 2. Create the Private Storage Bucket for photos/videos (already done usually, but here for completeness)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-media', 'note-media', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow Service Role to manage the storage bucket (same as before)
DROP POLICY IF EXISTS "Service Role Storage Policy" ON storage.objects;
CREATE POLICY "Service Role Storage Policy"
ON storage.objects FOR ALL 
USING (bucket_id = 'note-media' AND auth.role() = 'service_role');
