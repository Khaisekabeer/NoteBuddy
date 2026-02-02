-- Run this in your Supabase SQL Editor to fix the foreign key constraints
-- This allows you to delete users without errors
-- It will delete all notes authored by the deleted user (CASCADE)
-- It will keep notes received by the deleted user but set the recipient to NULL

ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_author_id_fkey;

ALTER TABLE notes
ADD CONSTRAINT notes_author_id_fkey
    FOREIGN KEY (author_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_recipient_id_fkey;

ALTER TABLE notes
ADD CONSTRAINT notes_recipient_id_fkey
    FOREIGN KEY (recipient_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
