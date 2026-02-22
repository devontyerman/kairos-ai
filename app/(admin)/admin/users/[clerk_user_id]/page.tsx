export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import {
  getUserByClerkId,
  getUserSessionSummaries,
  getDisplayName,
  CoachingReport,
  UserSessionSummary,
} from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";

interface Props {
  params: { clerk_user_id: string };
}

// ─── Aggregate helpers ────────────────────────────────────────────────────────

function aggregateObjections(sessions: UserSessionSummary[]) {
  const map = new Map<
    string,
    { count: number; totalHandling: number; instances: number }
  >();
  for (const s of sessions) {
    const r = s.report_json as CoachingReport | null;
    if (!r?.objections_detected) continue;
    for (const obj of r.objections_detected) {
      const key = obj.objection.toLowerCase();
      const existing = map.get(key) ?? { count: 0, totalHandling: 0, instances: 0 };
      map.set(key, {
        count: existing.count + obj.count,
        totalHandling: existing.totalHandling + obj.handling_score,
        instances: existing.instances + 1,
      });
    }
  }
  return Array.from(map.entries())
    .map(([name, d]) => ({
      name,
      count: d.count,
      avgHandling: Math.round(d.totalHandling / d.instances),
    }))
    .sort((a, b) => a.avgHandling - b.avgHandling); // lowest handling score first = biggest struggle
}

function aggregateFrequent(items: string[]): Array<{ text: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.toLowerCase().trim();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildActionItems(sessions: UserSessionSummary[]): string[] {
  // Collect drills + next_session_plan from the 3 most recent sessions
  const items: string[] = [];
  for (const s of sessions.slice(0, 3)) {
    const r = s.report_json as CoachingReport | null;
    if (!r) continue;
    if (r.next_session_plan) items.push(r.next_session_plan);
    r.drills?.forEach((d) => items.push(`${d.title}: ${d.description}`));
  }
  return items.slice(0, 5);
}

function buildMissedOpportunities(sessions: UserSessionSummary[]) {
  const all: Array<{ description: string; session_date: string }> = [];
  for (const s of sessions.slice(0, 5)) {
    const r = s.report_json as CoachingReport | null;
    if (!r?.missed_opportunities) continue;
    for (const mo of r.missed_opportunities) {
      all.push({ description: mo.description, session_date: s.started_at });
    }
  }
  return all.slice(0, 6);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function UserProfilePage({ params }: Props) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const [profileUser, sessions] = await Promise.all([
    getUserByClerkId(params.clerk_user_id),
    getUserSessionSummaries(params.clerk_user_id),
  ]);

  if (!profileUser) notFound();

  // All sessions (including < 1 min) for activity stats — we reuse the filtered ones
  const totalSessions = sessions.length;
  const scores = sessions
    .map((s) => s.overall_score)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  const lastActive = sessions[0]?.started_at ?? null;

  const scoreTrend = sessions
    .filter((s) => s.overall_score !== null)
    .slice(0, 10)
    .reverse(); // oldest first for trend

  const allStrengths = sessions.flatMap(
    (s) => (s.report_json as CoachingReport | null)?.strengths ?? []
  );
  const allWeaknesses = sessions.flatMap(
    (s) => (s.report_json as CoachingReport | null)?.areas_to_improve ?? []
  );

  const topStrengths = aggregateFrequent(allStrengths);
  const topWeaknesses = aggregateFrequent(allWeaknesses);
  const objections = aggregateObjections(sessions);
  const actionItems = buildActionItems(sessions);
  const missedOpps = buildMissedOpportunities(sessions);

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreRingColor = (score: number) =>
    score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-yellow-500" : "stroke-red-500";

  const formatDuration = (secs: number | null) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const maxScore = Math.max(...scoreTrend.map((s) => s.overall_score ?? 0), 1);

  return (
    <div className="min-h-screen bg-gray-950">
      <AppNav userRole={admin.role} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/admin/users"
            className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1 mb-3"
          >
            ← Back to Users
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {getDisplayName(profileUser)}
              </h1>
              {(profileUser.first_name || profileUser.last_name) && (
                <p className="text-gray-500 text-sm mt-0.5">{profileUser.email}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    profileUser.role === "admin"
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {profileUser.role}
                </span>
                <span className="text-gray-500 text-sm">
                  Joined {new Date(profileUser.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
                {lastActive && (
                  <span className="text-gray-500 text-sm">
                    Last active{" "}
                    {new Date(lastActive).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Avg score ring */}
            {avgScore !== null && (
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                      strokeDasharray={`${avgScore} ${100 - avgScore}`}
                      strokeLinecap="round"
                      className={scoreRingColor(avgScore)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</span>
                  </div>
                </div>
                <span className="text-gray-500 text-xs mt-1">Avg Score</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Completed Sessions", value: totalSessions },
            { label: "Avg Score", value: avgScore !== null ? `${avgScore}/100` : "—" },
            {
              label: "Best Session",
              value: scores.length ? `${Math.max(...scores)}/100` : "—",
            },
            {
              label: "Total Practice Time",
              value:
                sessions.length
                  ? formatDuration(
                      sessions.reduce(
                        (acc, s) => acc + (s.duration_seconds ?? 0),
                        0
                      )
                    )
                  : "—",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-500 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {totalSessions === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center text-gray-500">
            No completed sessions over 1 minute yet.
          </div>
        ) : (
          <>
            {/* Score trend */}
            {scoreTrend.length > 1 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="font-semibold text-white mb-4">Score Trend</h2>
                <div className="flex items-end gap-2 h-24">
                  {scoreTrend.map((s, i) => {
                    const score = s.overall_score ?? 0;
                    const height = Math.round((score / 100) * 96);
                    return (
                      <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                        <span className={`text-xs font-semibold ${scoreColor(score)}`}>
                          {score}
                        </span>
                        <div
                          className={`w-full rounded-t-md ${
                            score >= 80
                              ? "bg-green-500/60"
                              : score >= 60
                                ? "bg-yellow-500/60"
                                : "bg-red-500/60"
                          }`}
                          style={{ height: `${height}px` }}
                        />
                        <span className="text-gray-600 text-xs">
                          {new Date(s.started_at).toLocaleDateString("en-US", {
                            month: "numeric",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* trend label */}
                {scoreTrend.length >= 2 && (() => {
                  const first = scoreTrend[0].overall_score ?? 0;
                  const last = scoreTrend[scoreTrend.length - 1].overall_score ?? 0;
                  const diff = last - first;
                  return (
                    <p className={`text-sm mt-3 ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {diff >= 0 ? "↑" : "↓"} {Math.abs(diff)} points since first session
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="font-semibold text-green-400 mb-4">Consistent Strengths</h2>
                {topStrengths.length === 0 ? (
                  <p className="text-gray-500 text-sm">Not enough data yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span className="capitalize">{s.text}</span>
                        {s.count > 1 && (
                          <span className="ml-auto text-xs text-gray-600">{s.count}x</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="font-semibold text-red-400 mb-4">Recurring Weaknesses</h2>
                {topWeaknesses.length === 0 ? (
                  <p className="text-gray-500 text-sm">Not enough data yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topWeaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span className="capitalize">{w.text}</span>
                        {w.count > 1 && (
                          <span className="ml-auto text-xs text-gray-600">{w.count}x</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Objection handling */}
            {objections.length > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="font-semibold text-white mb-4">Objection Handling</h2>
                <p className="text-gray-500 text-xs mb-4">Sorted by handling score — lowest first (biggest struggles at top)</p>
                <div className="space-y-3">
                  {objections.map((obj, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-gray-300 text-sm capitalize w-40 flex-shrink-0">
                        {obj.name}
                      </span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            obj.avgHandling >= 7
                              ? "bg-green-500"
                              : obj.avgHandling >= 4
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${obj.avgHandling * 10}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold w-12 text-right ${
                        obj.avgHandling >= 7 ? "text-green-400" : obj.avgHandling >= 4 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {obj.avgHandling}/10
                      </span>
                      <span className="text-gray-600 text-xs w-12">{obj.count}x raised</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missed opportunities */}
            {missedOpps.length > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h2 className="font-semibold text-orange-400 mb-4">Recurring Missed Opportunities</h2>
                <ul className="space-y-2">
                  {missedOpps.map((mo, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{mo.description}</span>
                      <span className="ml-auto text-xs text-gray-600 flex-shrink-0">
                        {new Date(mo.session_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action items */}
            {actionItems.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-2xl p-6">
                <h2 className="font-semibold text-blue-300 mb-4">Action Items for This Rep</h2>
                <ul className="space-y-3">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-session list */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="font-semibold text-white">Session History</h2>
                <p className="text-gray-500 text-xs mt-1">Only sessions longer than 1 minute</p>
              </div>
              <div className="divide-y divide-gray-800">
                {sessions.map((s) => {
                  const r = s.report_json as CoachingReport | null;
                  const strength = r?.strengths?.[0] ?? null;
                  const weakness = r?.areas_to_improve?.[0] ?? null;
                  return (
                    <div key={s.id} className="px-6 py-4 hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-white text-sm font-medium">
                              {s.scenario_name ?? "Unknown Scenario"}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(s.started_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-gray-600 text-xs">
                              {formatDuration(s.duration_seconds)}
                            </span>
                          </div>
                          {strength && (
                            <p className="text-xs text-green-400/80 mt-1">
                              ✓ {strength}
                            </p>
                          )}
                          {weakness && (
                            <p className="text-xs text-red-400/80 mt-0.5">
                              ✗ {weakness}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {s.overall_score !== null && (
                            <span className={`text-lg font-bold ${scoreColor(s.overall_score)}`}>
                              {s.overall_score}
                            </span>
                          )}
                          <Link
                            href={`/results/${s.id}`}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Report →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
