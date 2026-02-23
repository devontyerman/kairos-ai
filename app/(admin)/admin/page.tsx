export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import {
  listUsers,
  listScenarios,
  listSessions,
  listSessionsWithDetails,
} from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";

export default async function AdminDashboard() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const [users, scenarios, sessions, detailedSessions] = await Promise.all([
    listUsers(),
    listScenarios(),
    listSessions(),
    listSessionsWithDetails(),
  ]);

  const recentSessions = sessions.slice(0, 5);

  // ─── Cost estimates ───────────────────────────────────────────────────────
  const REALTIME_COST_PER_MIN = 0.30; // ~$0.06 input + ~$0.24 output per min
  const REPORT_COST_EACH = 0.03; // GPT-4o text analysis per session

  const completedSessions = detailedSessions.filter(
    (s) => s.ended_at && s.duration_seconds && s.duration_seconds > 60
  );

  const totalMinutes = completedSessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0) / 60,
    0
  );
  const realtimeCost = totalMinutes * REALTIME_COST_PER_MIN;
  const reportCost = completedSessions.length * REPORT_COST_EACH;
  const totalCost = realtimeCost + reportCost;

  // This month's costs
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthSessions = completedSessions.filter(
    (s) => new Date(s.started_at) >= monthStart
  );
  const thisMonthMinutes = thisMonthSessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0) / 60,
    0
  );
  const thisMonthCost =
    thisMonthMinutes * REALTIME_COST_PER_MIN +
    thisMonthSessions.length * REPORT_COST_EACH;

  const formatCost = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={admin.role} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-gray-600 mt-1">
            Manage users, scenarios, and sessions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: users.length, color: "blue", href: "/admin/users" },
            {
              label: "Active Users",
              value: users.filter((u) => !u.is_disabled).length,
              color: "green",
            },
            {
              label: "Scenarios",
              value: scenarios.length,
              color: "purple",
            },
            {
              label: "Sessions",
              value: sessions.length,
              color: "orange",
            },
          ].map((stat) => {
            const inner = (
              <>
                <div
                  className={`text-3xl font-bold text-${stat.color}-500 mb-1`}
                >
                  {stat.value}
                </div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </>
            );
            return "href" in stat && stat.href ? (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-gray-50 rounded-2xl border border-gray-200 p-5 hover:bg-gray-100 transition-colors"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={stat.label}
                className="bg-gray-50 rounded-2xl border border-gray-200 p-5"
              >
                {inner}
              </div>
            );
          })}
        </div>

        {/* Estimated OpenAI Costs */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Estimated OpenAI Costs
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Based on session durations — ~$0.30/min realtime + ~$0.03/report
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCost(thisMonthCost)}
              </div>
              <div className="text-gray-500 text-xs">This Month</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCost(totalCost)}
              </div>
              <div className="text-gray-500 text-xs">All Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(thisMonthMinutes)}m
              </div>
              <div className="text-gray-500 text-xs">Minutes This Month</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {thisMonthSessions.length}
              </div>
              <div className="text-gray-500 text-xs">Sessions This Month</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Manage Users
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Invite, disable, and set roles
            </p>
          </Link>

          <Link
            href="/admin/scenarios"
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">🎭</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Manage Scenarios
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Create and edit prospect personas
            </p>
          </Link>

          <Link
            href="/admin/sessions"
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              View Sessions
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Browse all training sessions
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">⚙️</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Master Controls
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Global behavior, style, and coaching overrides
            </p>
          </Link>
        </div>

        {/* Recent sessions */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Sessions</h2>
            <Link
              href="/admin/sessions"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              View all →
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/results/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <span className="text-gray-900 text-sm font-medium">
                      {s.clerk_user_id.slice(0, 16)}...
                    </span>
                    <span className="text-gray-400 text-xs ml-3">
                      {new Date(s.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.ended_at
                        ? "bg-green-500/10 text-green-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {s.ended_at ? "Completed" : "In Progress"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
