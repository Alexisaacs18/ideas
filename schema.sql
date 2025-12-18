-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date INTEGER DEFAULT (unixepoch()),
  size_bytes INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Embeddings table
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding TEXT NOT NULL,
  chunk_index INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Messages/chat history
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);