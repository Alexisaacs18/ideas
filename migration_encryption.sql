-- Migration: Make chunk_text nullable in embeddings table for encryption
-- This allows storing embeddings without the original text chunks
-- The encrypted text is stored in R2 instead

-- Note: This migration makes chunk_text nullable
-- Existing rows will keep their chunk_text, but new rows will have NULL
-- The application will handle both cases (encrypted and unencrypted documents)

-- SQLite doesn't support ALTER COLUMN to change nullability directly
-- We need to recreate the table

-- Step 1: Create new table with nullable chunk_text
CREATE TABLE embeddings_new (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_text TEXT,  -- Now nullable
  embedding TEXT NOT NULL,
  chunk_index INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Step 2: Copy existing data
INSERT INTO embeddings_new (id, document_id, chunk_text, embedding, chunk_index)
SELECT id, document_id, chunk_text, embedding, chunk_index
FROM embeddings;

-- Step 3: Drop old table
DROP TABLE embeddings;

-- Step 4: Rename new table
ALTER TABLE embeddings_new RENAME TO embeddings;

-- Note: After this migration, new documents will have NULL chunk_text
-- Old documents will still have chunk_text for backward compatibility
-- The application code handles both cases

