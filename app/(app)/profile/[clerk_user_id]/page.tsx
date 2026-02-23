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

// ─── Aggregate helpers (same as /profile) ─────────────────────────────────────

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
      const existing = map.get(key) ?? {
        count: 0,
        totalHandling: 0,
        instances: 0,
      };
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
    .sort((a, b) => a.avgHandling - b.avgHandling);
}

function aggregateFrequent(
  items: string[]
): Array<{ text: string; count: number }> {
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

function buildImprovementTips(sessions: UserSessionSummary[]): string[] {
  const tips: string[] = [];
  for (const s of sessions.slice(0, 3)) {
    const r = s.report_json as CoachingReport | null;
    if (r?.next_session_plan) tips.push(r.next_session_plan);
  }
  const seenDrills = new Set<string>();
  for (const s of sessions.slice(0, 5)) {
    const r = s.report_json as CoachingReport | null;
    if (!r?.drills) continue;
    for (const drill of r.drills) {
      const key = drill.title.toLowerCase();
      if (!seenDrills.has(key)) {
        seenDrills.add(key);
        tips.push(`${drill.title}: ${drill.description}`);
      }
    }
  }
  return tips.slice(0, 5);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  params: { clerk_user_id: string };
}

export default async function UserProfilePage({ params }: Props) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/sign-in");
  }

  const profileUser = await getUserByClerkId(params.clerk_user_id);
  if (!profileUser) notFound();

  const sessions = await getUserSessionSummaries(params.clerk_user_id);

  const totalSessions = sessions.length;
  const scores = sessions
    .map((s) => s.overall_score)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const scoreTrend = sessions
    .filter((s) => s.overall_score !== null)
    .slice(0, 20)
    .reverse();

  const allStrengths = sessions.flatMap(
    (s) => (s.report_json as CoachingReport | null)?.strengths ?? []
  );
  const allWeaknesses = sessions.flatMap(
    (s) => (s.report_json as CoachingReport | null)?.areas_to_improve ?? []
  );

  const topStrengths = aggregateFrequent(allStrengths);
  const topWeaknesses = aggregateFrequent(allWeaknesses);
  const objections = aggregateObjections(sessions);
  const improvementTips = buildImprovementTips(sessions);

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-500";
  };

  const scoreRingColor = (score: number) =>
    score >= 80
      ? "stroke-green-500"
      : score >= 60
        ? "stroke-yellow-500"
        : "stroke-red-500";

  const formatDuration = (secs: number | null) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const chartWidth = 700;
  const chartHeight = 200;
  const chartPadLeft = 40;
  const chartPadRight = 20;
  const chartPadTop = 15;
  const chartPadBottom = 30;
  const plotW = chartWidth - chartPadLeft - chartPadRight;
  const plotH = chartHeight - chartPadTop - chartPadBottom;

  const chartPoints = scoreTrend.map((s, i) => {
    const x =
      chartPadLeft +
      (scoreTrend.length > 1
        ? (i / (scoreTrend.length - 1)) * plotW
        : plotW / 2);
    const y = chartPadTop + plotH - ((s.overall_score ?? 0) / 100) * plotH;
    return { x, y, score: s.overall_score ?? 0, date: s.started_at };
  });

  const polyline = chartPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={admin.role} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/profile"
              className="text-blue-600 hover:text-blue-500 text-sm inline-flex items-center gap-1 mb-2"
            >
              ← Back to My Profile
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {getDisplayName(profileUser)}
            </h1>
            {(profileUser.first_name || profileUser.last_name) && (
              <p className="text-gray-500 text-sm mt-0.5">
                {profileUser.email}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  profileUser.role === "admin"
                    ? "bg-purple-50 text-purple-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {profileUser.role}
              </span>
              <span className="text-gray-500 text-sm">
                Joined{" "}
                {new Date(profileUser.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {avgScore !== null && (
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20">
                <svg
                  viewBox="0 0 36 36"
                  className="w-full h-full -rotate-90"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={`${avgScore} ${100 - avgScore}`}
                    strokeLinecap="round"
                    className={scoreRingColor(avgScore)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-xl font-bold ${scoreColor(avgScore)}`}
                  >
                    {avgScore}
                  </span>
                </div>
              </div>
              <span className="text-gray-400 text-xs mt-1">Avg Score</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Completed Sessions", value: totalSessions },
            {
              label: "Avg Score",
              value: avgScore !== null ? `${avgScore}/100` : "—",
            },
            {
              label: "Best Session",
              value: scores.length ? `${Math.max(...scores)}/100` : "—",
            },
            {
              label: "Total Practice Time",
              value: sessions.length
                ? formatDuration(
                    sessions.reduce(
                      (acc, s) => acc + (s.duration_seconds ?? 0),
                      0
                    )
                  )
                : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-50 rounded-2xl border border-gray-200 p-5"
            >
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-gray-500 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {totalSessions === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
            No completed sessions over 1 minute yet.
          </div>
        ) : (
          <>
            {/* Performance Over Time */}
            {scoreTrend.length > 1 && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Performance Over Time
                </h2>
                <div className="overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full max-w-[700px]"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {[0, 20, 40, 60, 80, 100].map((val) => {
                      const y =
                        chartPadTop + plotH - (val / 100) * plotH;
                      return (
                        <g key={val}>
                          <line
                            x1={chartPadLeft}
                            y1={y}
                            x2={chartWidth - chartPadRight}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <text
                            x={chartPadLeft - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-gray-400"
                            fontSize="10"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}
                    <polyline
                      points={polyline}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {chartPoints.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          className={
                            p.score >= 80
                              ? "fill-green-500"
                              : p.score >= 60
                                ? "fill-yellow-500"
                                : "fill-red-500"
                          }
                          stroke="white"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          fontSize="9"
                          className={
                            p.score >= 80
                              ? "fill-green-600"
                              : p.score >= 60
                                ? "fill-yellow-600"
                                : "fill-red-500"
                          }
                          fontWeight="600"
                        >
                          {p.score}
                        </text>
                        <text
                          x={p.x}
                          y={chartHeight - 5}
                          textAnchor="middle"
                          className="fill-gray-400"
                          fontSize="9"
                        >
                          {new Date(p.date).toLocaleDateString("en-US", {
                            month: "numeric",
                            day: "numeric",
                          })}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                {scoreTrend.length >= 2 &&
                  (() => {
                    const first = scoreTrend[0].overall_score ?? 0;
                    const last =
                      scoreTrend[scoreTrend.length - 1].overall_score ?? 0;
                    const diff = last - first;
                    return (
                      <p
                        className={`text-sm mt-3 ${diff >= 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {diff >= 0 ? "↑" : "↓"} {Math.abs(diff)} points since
                        first session
                      </p>
                    );
                  })()}
              </div>
            )}

            {/* Three Stat Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-red-500 mb-1">
                  Top Objections
                </h2>
                <p className="text-gray-400 text-xs mb-4">
                  Sorted by handling score — lowest first
                </p>
                {objections.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No objection data yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {objections.slice(0, 5).map((obj, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-700 text-sm capitalize truncate mr-2">
                            {obj.name}
                          </span>
                          <span
                            className={`text-xs font-semibold flex-shrink-0 ${
                              obj.avgHandling >= 7
                                ? "text-green-600"
                                : obj.avgHandling >= 4
                                  ? "text-yellow-600"
                                  : "text-red-500"
                            }`}
                          >
                            {obj.avgHandling}/10
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              obj.avgHandling >= 7
                                ? "bg-green-500"
                                : obj.avgHandling >= 4
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{
                              width: `${obj.avgHandling * 10}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-green-600 mb-1">
                  Key Strengths
                </h2>
                <p className="text-gray-400 text-xs mb-4">
                  Most consistent across sessions
                </p>
                {topStrengths.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Not enough data yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topStrengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-green-500 mt-0.5">•</span>
                        <span className="capitalize flex-1">{s.text}</span>
                        {s.count > 1 && (
                          <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                            {s.count}x
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-blue-600 mb-1">
                  Where to Improve
                </h2>
                <p className="text-gray-400 text-xs mb-4">
                  Based on recent sessions
                </p>
                {improvementTips.length === 0 && topWeaknesses.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Not enough data yet.
                  </p>
                ) : improvementTips.length > 0 ? (
                  <ul className="space-y-2">
                    {improvementTips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {topWeaknesses.slice(0, 5).map((w, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span className="capitalize">{w.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Session History */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  Session History
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                  Click any session to view the full report
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {sessions.map((s) => {
                  const r = s.report_json as CoachingReport | null;
                  const strength = r?.strengths?.[0] ?? null;
                  const weakness = r?.areas_to_improve?.[0] ?? null;
                  return (
                    <Link
                      key={s.id}
                      href={`/results/${s.id}`}
                      className="block px-6 py-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-gray-900 text-sm font-medium">
                              {s.scenario_name ?? "Training Session"}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(s.started_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {formatDuration(s.duration_seconds)}
                            </span>
                          </div>
                          {strength && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ {strength}
                            </p>
                          )}
                          {weakness && (
                            <p className="text-xs text-red-500 mt-0.5">
                              ✗ {weakness}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {s.overall_score !== null && (
                            <span
                              className={`text-lg font-bold ${scoreColor(s.overall_score)}`}
                            >
                              {s.overall_score}
                            </span>
                          )}
                          <span className="text-blue-600 text-xs">
                            Report →
                          </span>
                        </div>
                      </div>
                    </Link>
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
