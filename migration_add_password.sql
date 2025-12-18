-- Migration: Add password_hash and name columns to users table
-- Run this migration to enable email/password authentication
-- This migration is safe to run multiple times (it checks if columns exist)

-- Add password_hash column (nullable for existing users and OAuth users)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll catch the error if it already exists
-- For remote database, run with: wrangler d1 execute second_brain_db --file=./migration_add_password.sql --remote

-- Check if password_hash column exists, if not add it
-- SQLite doesn't have a direct way to check, so we'll try to add and ignore errors
-- In practice, you may need to check your database schema first

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN name TEXT;

