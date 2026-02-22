"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SessionWithDetails } from "@/lib/db";

interface Props {
  sessions: SessionWithDetails[];
}

export default function SessionsClient({ sessions }: Props) {
  const [filterEmail, setFilterEmail] = useState("all");

  // Unique users for the filter dropdown
  const users = useMemo(() => {
    const seen = new Map<string, string>();
    sessions.forEach((s) => seen.set(s.clerk_user_id, s.display_name));
    return Array.from(seen.entries()).map(([id, display_name]) => ({ id, display_name }));
  }, [sessions]);

  const filtered = useMemo(
    () =>
      filterEmail === "all"
        ? sessions
        : sessions.filter((s) => s.clerk_user_id === filterEmail),
    [sessions, filterEmail]
  );

  const formatDuration = (secs: number | null) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Filter by user:</label>
        <select
          value={filterEmail}
          onChange={(e) => setFilterEmail(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All users ({sessions.length})</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.display_name} (
              {sessions.filter((s) => s.clerk_user_id === u.id).length})
            </option>
          ))}
        </select>
        {filterEmail !== "all" && (
          <Link
            href={`/admin/users/${filterEmail}`}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View profile →
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">User</th>
                <th className="text-left px-6 py-3">Scenario</th>
                <th className="text-left px-6 py-3">Started</th>
                <th className="text-left px-6 py-3">Duration</th>
                <th className="text-left px-6 py-3">Score</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${s.clerk_user_id}`}
                      className="text-sm text-white hover:text-blue-400 transition-colors"
                    >
                      {s.display_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {s.scenario_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(s.started_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {s.ended_at
                      ? formatDuration(s.duration_seconds)
                      : "In progress"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-semibold ${scoreColor(s.overall_score)}`}
                    >
                      {s.overall_score !== null ? `${s.overall_score}` : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        s.ended_at
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {s.ended_at ? "Completed" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.ended_at && (
                      <Link
                        href={`/results/${s.id}`}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        View Report →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              No sessions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
