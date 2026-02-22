export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { getSession, getTurns, getReport, getScenario } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";

interface Props {
  params: { sessionId: string };
}

export default async function ResultsPage({ params }: Props) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/sign-in");
  }

  const session = await getSession(params.sessionId);
  if (!session) notFound();

  // Only allow the session owner or admin
  if (
    session.clerk_user_id !== user.clerk_user_id &&
    user.role !== "admin"
  ) {
    redirect("/train");
  }

  const [turns, report, scenario] = await Promise.all([
    getTurns(params.sessionId),
    getReport(params.sessionId),
    session.scenario_id ? getScenario(session.scenario_id) : null,
  ]);

  const r = report?.report_json;
  const score = report?.overall_score ?? 0;

  const scoreColor =
    score >= 80
      ? "text-green-400"
      : score >= 60
        ? "text-yellow-400"
        : "text-red-400";

  const scoreRing =
    score >= 80
      ? "stroke-green-500"
      : score >= 60
        ? "stroke-yellow-500"
        : "stroke-red-500";

  const sessionDuration = session.ended_at
    ? Math.round(
        (new Date(session.ended_at).getTime() -
          new Date(session.started_at).getTime()) /
          1000
      )
    : null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={user.role} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/train"
              className="text-blue-600 hover:text-blue-500 text-sm mb-2 inline-flex items-center gap-1"
            >
              ← Back to Training
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              Session Report
            </h1>
            <p className="text-gray-600 mt-1">
              {scenario?.name ?? "Training Session"} •{" "}
              {new Date(session.started_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {sessionDuration && ` • ${formatDuration(sessionDuration)}`}
            </p>
          </div>

          {/* Score ring */}
          {report && (
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
                    strokeDasharray={`${score} ${100 - score}`}
                    strokeLinecap="round"
                    className={scoreRing}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-bold ${scoreColor}`}>
                    {score}
                  </span>
                </div>
              </div>
              <span className="text-gray-400 text-xs mt-1">Score</span>
            </div>
          )}
        </div>

        {!report ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-600">
              Report is being generated... Refresh in a moment.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            {r?.summary && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
                <p className="text-gray-700 leading-relaxed">{r.summary}</p>
              </div>
            )}

            {/* Strengths + Areas to Improve */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                  ✓ Strengths
                </h2>
                <ul className="space-y-2">
                  {(r?.strengths ?? []).map((s, i) => (
                    <li key={i} className="flex gap-2 text-gray-700 text-sm">
                      <span className="text-green-500 mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
                  ✗ Areas to Improve
                </h2>
                <ul className="space-y-2">
                  {(r?.areas_to_improve ?? []).map((a, i) => (
                    <li key={i} className="flex gap-2 text-gray-700 text-sm">
                      <span className="text-red-500 mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Objections Detected */}
            {r?.objections_detected && r.objections_detected.length > 0 && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Objections Detected
                </h2>
                <div className="space-y-4">
                  {r.objections_detected.map((obj, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {obj.objection}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">
                            {obj.count}x raised
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  obj.handling_score >= 7
                                    ? "bg-green-500"
                                    : obj.handling_score >= 4
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${obj.handling_score * 10}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {obj.handling_score}/10
                            </span>
                          </div>
                        </div>
                      </div>
                      {obj.example_snippet && (
                        <p className="text-gray-500 text-xs italic border-l-2 border-gray-300 pl-3">
                          &ldquo;{obj.example_snippet}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missed Opportunities */}
            {r?.missed_opportunities && r.missed_opportunities.length > 0 && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-orange-500 mb-4">
                  Missed Opportunities
                </h2>
                <div className="space-y-3">
                  {r.missed_opportunities.map((mo, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <p className="text-gray-900 text-sm mb-2">
                        {mo.description}
                      </p>
                      {mo.transcript_snippet && (
                        <p className="text-gray-500 text-xs italic border-l-2 border-orange-700/50 pl-3">
                          &ldquo;{mo.transcript_snippet}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drills */}
            {r?.drills && r.drills.length > 0 && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-blue-600 mb-4">
                  Recommended Drills
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {r.drills.map((drill, i) => (
                    <div
                      key={i}
                      className="bg-gray-100 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mb-3">
                        {i + 1}
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-2">
                        {drill.title}
                      </h3>
                      <p className="text-gray-600 text-xs mb-2">
                        {drill.description}
                      </p>
                      <p className="text-blue-500 text-xs">
                        Goal: {drill.goal}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Session Plan */}
            {r?.next_session_plan && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h2 className="font-semibold text-blue-600 mb-2">
                  Next Session Plan
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {r.next_session_plan}
                </p>
              </div>
            )}
          </>
        )}

        {/* Transcript */}
        {turns.length > 0 && (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Full Transcript</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex gap-3 ${turn.speaker === "agent" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      turn.speaker === "agent"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {turn.speaker === "agent" ? "You" : "AI"}
                  </div>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      turn.speaker === "agent"
                        ? "bg-blue-600/70 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pb-8">
          <Link
            href="/train"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            Train Again
          </Link>
        </div>
      </div>
    </div>
  );
}
