import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

export const sql = neon(DATABASE_URL);

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "admin" | "agent";

export interface AppUser {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  is_disabled: boolean;
  created_at: string;
}

export function getDisplayName(user: Pick<AppUser, "first_name" | "last_name" | "email">): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.email;
}

export interface Scenario {
  id: string;
  name: string;
  product_type: string;
  difficulty: "easy" | "medium" | "hard";
  persona_style: "friendly" | "neutral" | "skeptical" | "combative";
  objection_pool: string[];
  rules: {
    pushback_intensity?: number;
    willingness_to_commit?: number;
    interrupt_frequency?: number;
    [key: string]: unknown;
  };
  success_criteria: string[];
  training_objective: string;
  session_goal: "close" | "appointment";
  behavior_notes: string;
  client_description: string;
  client_age: number | null;
  voice: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  clerk_user_id: string;
  scenario_id: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface Turn {
  id: number;
  session_id: string;
  speaker: "agent" | "ai";
  text: string;
  created_at: string;
}

export interface Report {
  session_id: string;
  overall_score: number;
  report_json: CoachingReport;
  created_at: string;
}

export interface CoachingReport {
  summary: string;
  overall_score: number;
  strengths: string[];
  areas_to_improve: string[];
  objections_detected: Array<{
    objection: string;
    count: number;
    example_snippet: string;
    handling_score: number;
  }>;
  missed_opportunities: Array<{
    description: string;
    transcript_snippet: string;
  }>;
  drills: Array<{
    title: string;
    description: string;
    goal: string;
    example_script?: string;
  }>;
  next_session_plan: string;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(
  clerkUserId: string,
  email: string,
  firstName: string | null = null,
  lastName: string | null = null
): Promise<AppUser> {
  const adminEmail = process.env.APP_ADMIN_EMAIL;
  const role: Role = email === adminEmail ? "admin" : "agent";

  const rows = await sql`
    INSERT INTO app_users (clerk_user_id, email, role, first_name, last_name)
    VALUES (${clerkUserId}, ${email}, ${role}, ${firstName}, ${lastName})
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET email      = EXCLUDED.email,
          first_name = COALESCE(EXCLUDED.first_name, app_users.first_name),
          last_name  = COALESCE(EXCLUDED.last_name, app_users.last_name),
          role       = CASE
                         WHEN app_users.email = ${adminEmail} THEN 'admin'
                         ELSE app_users.role
                       END
    RETURNING *
  `;
  return rows[0] as AppUser;
}

export async function getUserByClerkId(
  clerkUserId: string
): Promise<AppUser | null> {
  const rows = await sql`
    SELECT * FROM app_users WHERE clerk_user_id = ${clerkUserId}
  `;
  return (rows[0] as AppUser) ?? null;
}

export async function listUsers(): Promise<AppUser[]> {
  const rows = await sql`SELECT * FROM app_users ORDER BY created_at DESC`;
  return rows as AppUser[];
}

export async function updateUser(
  clerkUserId: string,
  patch: Partial<Pick<AppUser, "role" | "is_disabled">>
): Promise<AppUser> {
  const rows = await sql`
    UPDATE app_users
    SET
      role        = COALESCE(${patch.role ?? null}, role),
      is_disabled = COALESCE(${patch.is_disabled ?? null}, is_disabled)
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `;
  return rows[0] as AppUser;
}

// ─── Scenario helpers ─────────────────────────────────────────────────────────

export async function listScenarios(): Promise<Scenario[]> {
  const rows = await sql`SELECT * FROM scenarios ORDER BY created_at ASC`;
  return rows as Scenario[];
}

export async function getScenario(id: string): Promise<Scenario | null> {
  const rows = await sql`SELECT * FROM scenarios WHERE id = ${id}`;
  return (rows[0] as Scenario) ?? null;
}

export async function createScenario(
  data: Omit<Scenario, "id" | "created_at" | "updated_at">
): Promise<Scenario> {
  const rows = await sql`
    INSERT INTO scenarios (
      name, product_type, difficulty, persona_style, objection_pool, rules,
      success_criteria, training_objective, session_goal, behavior_notes,
      client_description, client_age, voice
    )
    VALUES (
      ${data.name},
      ${data.product_type},
      ${data.difficulty},
      ${data.persona_style},
      ${JSON.stringify(data.objection_pool)},
      ${JSON.stringify(data.rules)},
      ${JSON.stringify(data.success_criteria ?? [])},
      ${data.training_objective ?? "objection-handling"},
      ${data.session_goal ?? "close"},
      ${data.behavior_notes ?? ""},
      ${data.client_description ?? ""},
      ${data.client_age ?? null},
      ${data.voice ?? "alloy"}
    )
    RETURNING *
  `;
  return rows[0] as Scenario;
}

export async function updateScenario(
  id: string,
  data: Partial<Omit<Scenario, "id" | "created_at" | "updated_at">>
): Promise<Scenario> {
  const rows = await sql`
    UPDATE scenarios SET
      name               = COALESCE(${data.name ?? null}, name),
      product_type       = COALESCE(${data.product_type ?? null}, product_type),
      difficulty         = COALESCE(${data.difficulty ?? null}, difficulty),
      persona_style      = COALESCE(${data.persona_style ?? null}, persona_style),
      objection_pool     = COALESCE(${data.objection_pool ? JSON.stringify(data.objection_pool) : null}::jsonb, objection_pool),
      rules              = COALESCE(${data.rules ? JSON.stringify(data.rules) : null}::jsonb, rules),
      success_criteria   = COALESCE(${data.success_criteria ? JSON.stringify(data.success_criteria) : null}::jsonb, success_criteria),
      training_objective = COALESCE(${data.training_objective ?? null}, training_objective),
      session_goal       = COALESCE(${data.session_goal ?? null}, session_goal),
      behavior_notes     = ${data.behavior_notes ?? null},
      client_description = ${data.client_description ?? null},
      client_age         = ${data.client_age !== undefined ? data.client_age : null},
      voice              = COALESCE(${data.voice ?? null}, voice),
      updated_at         = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] as Scenario;
}

export async function deleteScenario(id: string): Promise<void> {
  await sql`DELETE FROM scenarios WHERE id = ${id}`;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function createSession(
  clerkUserId: string,
  scenarioId: string
): Promise<Session> {
  const rows = await sql`
    INSERT INTO sessions (clerk_user_id, scenario_id)
    VALUES (${clerkUserId}, ${scenarioId})
    RETURNING *
  `;
  return rows[0] as Session;
}

export async function endSession(sessionId: string): Promise<Session> {
  const rows = await sql`
    UPDATE sessions SET ended_at = NOW() WHERE id = ${sessionId} RETURNING *
  `;
  return rows[0] as Session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const rows = await sql`SELECT * FROM sessions WHERE id = ${sessionId}`;
  return (rows[0] as Session) ?? null;
}

export async function listSessions(clerkUserId?: string): Promise<Session[]> {
  if (clerkUserId) {
    const rows = await sql`
      SELECT * FROM sessions WHERE clerk_user_id = ${clerkUserId} ORDER BY started_at DESC
    `;
    return rows as Session[];
  }
  const rows = await sql`SELECT * FROM sessions ORDER BY started_at DESC`;
  return rows as Session[];
}

// ─── Rich session queries ─────────────────────────────────────────────────────

export interface SessionWithDetails {
  id: string;
  clerk_user_id: string;
  email: string;
  display_name: string;
  scenario_id: string | null;
  scenario_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  overall_score: number | null;
}

export async function listSessionsWithDetails(): Promise<SessionWithDetails[]> {
  const rows = await sql`
    SELECT
      s.id,
      s.clerk_user_id,
      COALESCE(u.email, s.clerk_user_id) AS email,
      COALESCE(
        NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
        u.email,
        s.clerk_user_id
      ) AS display_name,
      s.scenario_id,
      sc.name AS scenario_name,
      s.started_at,
      s.ended_at,
      EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer AS duration_seconds,
      r.overall_score
    FROM sessions s
    LEFT JOIN app_users u  ON u.clerk_user_id = s.clerk_user_id
    LEFT JOIN scenarios sc ON sc.id = s.scenario_id
    LEFT JOIN reports r    ON r.session_id = s.id
    ORDER BY s.started_at DESC
  `;
  return rows as SessionWithDetails[];
}

export interface UserSessionSummary {
  id: string;
  scenario_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  overall_score: number | null;
  report_json: CoachingReport | null;
}

export async function getUserSessionSummaries(
  clerkUserId: string
): Promise<UserSessionSummary[]> {
  const rows = await sql`
    SELECT
      s.id,
      sc.name AS scenario_name,
      s.started_at,
      s.ended_at,
      EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::integer AS duration_seconds,
      r.overall_score,
      r.report_json
    FROM sessions s
    LEFT JOIN scenarios sc ON sc.id = s.scenario_id
    LEFT JOIN reports r    ON r.session_id = s.id
    WHERE s.clerk_user_id = ${clerkUserId}
      AND s.ended_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) > 60
    ORDER BY s.started_at DESC
  `;
  return rows as UserSessionSummary[];
}

// ─── Turn helpers ─────────────────────────────────────────────────────────────

export async function insertTurns(
  sessionId: string,
  turns: Array<{ speaker: "agent" | "ai"; text: string }>
): Promise<void> {
  for (const turn of turns) {
    await sql`
      INSERT INTO turns (session_id, speaker, text)
      VALUES (${sessionId}, ${turn.speaker}, ${turn.text})
    `;
  }
}

export async function getTurns(sessionId: string): Promise<Turn[]> {
  const rows = await sql`
    SELECT * FROM turns WHERE session_id = ${sessionId} ORDER BY created_at ASC
  `;
  return rows as Turn[];
}

// ─── Report helpers ───────────────────────────────────────────────────────────

export async function saveReport(
  sessionId: string,
  score: number,
  report: CoachingReport
): Promise<Report> {
  const rows = await sql`
    INSERT INTO reports (session_id, overall_score, report_json)
    VALUES (${sessionId}, ${score}, ${JSON.stringify(report)})
    ON CONFLICT (session_id) DO UPDATE
      SET overall_score = EXCLUDED.overall_score,
          report_json   = EXCLUDED.report_json
    RETURNING *
  `;
  return rows[0] as Report;
}

export async function getReport(sessionId: string): Promise<Report | null> {
  const rows = await sql`SELECT * FROM reports WHERE session_id = ${sessionId}`;
  return (rows[0] as Report) ?? null;
}
