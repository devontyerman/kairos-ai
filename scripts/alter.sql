-- Run this in Neon SQL Editor to add new columns
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS client_description TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS client_age INTEGER;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS voice TEXT NOT NULL DEFAULT 'alloy';
