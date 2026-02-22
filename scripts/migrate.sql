-- AI Sales Trainer - Database Migrations
-- Run against your Neon Postgres database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- Table: app_users
-- Mirrors Clerk users; stores role & disabled flag
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  is_disabled     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table: scenarios
-- Admin-created prospect behavior profiles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenarios (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  product_type     TEXT NOT NULL DEFAULT 'generic',
  difficulty       TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  persona_style    TEXT NOT NULL DEFAULT 'neutral' CHECK (persona_style IN ('friendly', 'neutral', 'skeptical', 'combative')),
  objection_pool   JSONB NOT NULL DEFAULT '[]',
  rules            JSONB NOT NULL DEFAULT '{}',
  success_criteria JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- Table: sessions
-- One row per training session
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id  TEXT NOT NULL,
  scenario_id    UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_clerk_user_id ON sessions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scenario_id ON sessions(scenario_id);

-- ─────────────────────────────────────────────
-- Table: turns
-- Individual transcript lines for a session
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turns (
  id         BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker    TEXT NOT NULL CHECK (speaker IN ('agent', 'ai')),
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);

-- ─────────────────────────────────────────────
-- Table: reports
-- Post-session AI coaching report (1:1 with sessions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  session_id    UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  report_json   JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Seed: Default scenarios
-- ─────────────────────────────────────────────
INSERT INTO scenarios (name, product_type, difficulty, persona_style, objection_pool, rules, success_criteria)
VALUES
(
  'Budget-Conscious Bob',
  'SaaS Software',
  'easy',
  'friendly',
  '["price", "need-to-think", "will-check-with-team"]'::jsonb,
  '{"pushback_intensity": 2, "willingness_to_commit": 7, "interrupt_frequency": 1}'::jsonb,
  '["Acknowledge the price concern", "Offer ROI comparison", "Ask for the close"]'::jsonb
),
(
  'Skeptical Sarah',
  'Financial Services',
  'medium',
  'skeptical',
  '["trust", "price", "need-to-think", "already-have-solution"]'::jsonb,
  '{"pushback_intensity": 5, "willingness_to_commit": 4, "interrupt_frequency": 2}'::jsonb,
  '["Build rapport", "Establish credibility", "Handle trust objection", "Present proof points", "Ask for next step"]'::jsonb
),
(
  'Combative Carl',
  'Enterprise Software',
  'hard',
  'combative',
  '["price", "spouse", "trust", "need-to-think", "not-interested", "bad-timing"]'::jsonb,
  '{"pushback_intensity": 9, "willingness_to_commit": 2, "interrupt_frequency": 5}'::jsonb,
  '["Stay calm under pressure", "Reframe objections", "Find any common ground", "Attempt soft close"]'::jsonb
)
ON CONFLICT DO NOTHING;
