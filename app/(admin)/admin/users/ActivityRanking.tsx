"use client";

import { useState } from "react";
import Link from "next/link";

interface UserActivity {
  clerk_user_id: string;
  display_name: string;
  email: string;
  sessions: Array<{
    started_at: string;
    duration_seconds: number;
    overall_score: number | null;
  }>;
}

type DateFilter = "all" | "30d" | "this_week" | "last_week";

const FILTERS: Array<{ key: DateFilter; label: string }> = [
  { key: "all", label: "All Time" },
  { key: "30d", label: "Past 30 Days" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
];

function getFilterRange(filter: DateFilter): Date | null {
  const now = new Date();
  if (filter === "all") return null;
  if (filter === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (filter === "this_week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = start
    const start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  // last_week
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - diff);
  thisMonday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  return lastMonday;
}

function getFilterEnd(filter: DateFilter): Date | null {
  if (filter !== "last_week") return null;
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - diff);
  thisMonday.setHours(0, 0, 0, 0);
  return thisMonday;
}

export default function ActivityRanking({ data }: { data: UserActivity[] }) {
  const [filter, setFilter] = useState<DateFilter>("30d");

  const rangeStart = getFilterRange(filter);
  const rangeEnd = getFilterEnd(filter);

  const ranked = data
    .map((u) => {
      const filtered = u.sessions.filter((s) => {
        const d = new Date(s.started_at);
        if (rangeStart && d < rangeStart) return false;
        if (rangeEnd && d >= rangeEnd) return false;
        return true;
      });
      const totalMin = filtered.reduce(
        (acc, s) => acc + s.duration_seconds / 60,
        0
      );
      const scores = filtered
        .map((s) => s.overall_score)
        .filter((s): s is number => s !== null);
      const avgScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      return {
        ...u,
        sessionCount: filtered.length,
        totalMin: Math.round(totalMin),
        avgScore,
      };
    })
    .sort((a, b) => b.sessionCount - a.sessionCount);

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-semibold text-gray-900">Activity Ranking</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-6 py-3 w-8">#</th>
              <th className="text-left px-6 py-3">User</th>
              <th className="text-right px-6 py-3">Sessions</th>
              <th className="text-right px-6 py-3">Minutes</th>
              <th className="text-right px-6 py-3">Avg Score</th>
              <th className="text-right px-6 py-3">Profile</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((u, i) => (
              <tr
                key={u.clerk_user_id}
                className="border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <td className="px-6 py-3 text-sm text-gray-400">{i + 1}</td>
                <td className="px-6 py-3">
                  <div className="text-sm text-gray-900 font-medium">
                    {u.display_name}
                  </div>
                  {u.display_name !== u.email && (
                    <div className="text-xs text-gray-400">{u.email}</div>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-gray-900 text-right font-semibold">
                  {u.sessionCount}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600 text-right">
                  {u.totalMin}m
                </td>
                <td className="px-6 py-3 text-sm text-right">
                  {u.avgScore !== null ? (
                    <span
                      className={`font-semibold ${
                        u.avgScore >= 80
                          ? "text-green-600"
                          : u.avgScore >= 60
                            ? "text-yellow-600"
                            : "text-red-500"
                      }`}
                    >
                      {u.avgScore}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    href={`/profile/${u.clerk_user_id}`}
                    className="text-blue-600 hover:text-blue-500 text-xs"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
