-- Clear Users, Conversations (Messages), and Documents
-- This action is IRREVERSIBLE!
-- 
-- Run this on LOCAL database:
--   wrangler d1 execute second_brain_db --file=./clear_all_data.sql
--
-- Run this on REMOTE database:
--   wrangler d1 execute second_brain_db --file=./clear_all_data.sql --remote

-- Delete in order to respect foreign key constraints:
-- 1. Delete embeddings first (references documents) - these will be cleaned up automatically
DELETE FROM embeddings;

-- 2. Delete documents (references users)
DELETE FROM documents;

-- 3. Delete messages/conversations (references users)
DELETE FROM messages;

-- 4. Delete users
DELETE FROM users;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM documents) as documents_count,
  (SELECT COUNT(*) FROM messages) as messages_count;

