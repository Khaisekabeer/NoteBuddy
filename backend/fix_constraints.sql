-- Run this in your Supabase SQL Editor to REVERT the foreign key constraints
-- This puts it back to the original safety settings (Prevent Deletion)
-- If you try to delete a user who has notes, it will fail again (which protects data)

ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_author_id_fkey;

ALTER TABLE notes
ADD CONSTRAINT notes_author_id_fkey
    FOREIGN KEY (author_id)
    REFERENCES users(id);

ALTER TABLE notes
DROP CONSTRAINT IF EXISTS notes_recipient_id_fkey;

ALTER TABLE notes
ADD CONSTRAINT notes_recipient_id_fkey
    FOREIGN KEY (recipient_id)
    REFERENCES users(id);
