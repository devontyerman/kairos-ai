-- Run this in Neon SQL Editor to add new columns
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS client_description TEXT NOT NULL DEFAULT '';
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS client_age INTEGER;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS voice TEXT NOT NULL DEFAULT 'alloy';

-- Added: training objective, session goal, behavior notes
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS training_objective TEXT NOT NULL DEFAULT 'objection-handling';
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS session_goal TEXT NOT NULL DEFAULT 'close';
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS behavior_notes TEXT NOT NULL DEFAULT '';
