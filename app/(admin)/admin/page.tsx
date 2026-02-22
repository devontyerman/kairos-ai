export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { listUsers, listScenarios, listSessions } from "@/lib/db";
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

  const [users, scenarios, sessions] = await Promise.all([
    listUsers(),
    listScenarios(),
    listSessions(),
  ]);

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-950">
      <AppNav userRole={admin.role} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Console</h1>
          <p className="text-gray-400 mt-1">
            Manage users, scenarios, and sessions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: users.length, color: "blue" },
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
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5"
            >
              <div
                className={`text-3xl font-bold text-${stat.color}-400 mb-1`}
              >
                {stat.value}
              </div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">👥</div>
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              Manage Users
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Invite, disable, and set roles
            </p>
          </Link>

          <Link
            href="/admin/scenarios"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">🎭</div>
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              Manage Scenarios
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Create and edit prospect personas
            </p>
          </Link>

          <Link
            href="/admin/sessions"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-6 transition-colors group"
          >
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              View Sessions
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Browse all training sessions
            </p>
          </Link>
        </div>

        {/* Recent sessions */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Sessions</h2>
            <Link
              href="/admin/sessions"
              className="text-blue-400 hover:text-blue-300 text-sm"
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
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <span className="text-white text-sm font-medium">
                      {s.clerk_user_id.slice(0, 16)}...
                    </span>
                    <span className="text-gray-500 text-xs ml-3">
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
