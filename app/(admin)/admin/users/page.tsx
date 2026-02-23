export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import {
  listUsers,
  listSessionsWithDetails,
  getDisplayName,
} from "@/lib/db";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import InviteForm from "./InviteForm";
import UserTable from "./UserTable";
import ActivityRanking from "./ActivityRanking";

export default async function AdminUsersPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const [users, sessions] = await Promise.all([
    listUsers(),
    listSessionsWithDetails(),
  ]);

  // Build per-user activity data for the ranking component
  const activityData = users.map((u) => {
    const userSessions = sessions.filter(
      (s) =>
        s.clerk_user_id === u.clerk_user_id &&
        s.ended_at &&
        s.duration_seconds &&
        s.duration_seconds > 60
    );
    return {
      clerk_user_id: u.clerk_user_id,
      display_name: getDisplayName(u),
      email: u.email,
      sessions: userSessions.map((s) => ({
        started_at: s.started_at,
        duration_seconds: s.duration_seconds ?? 0,
        overall_score: s.overall_score,
      })),
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={admin.role} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Invite new users and manage existing accounts
          </p>
        </div>

        <ActivityRanking data={activityData} />
        <InviteForm />
        <UserTable users={users} />
      </div>
    </div>
  );
}
