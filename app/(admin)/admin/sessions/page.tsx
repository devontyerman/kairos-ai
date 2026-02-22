export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { listSessionsWithDetails } from "@/lib/db";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import SessionsClient from "./SessionsClient";

export default async function AdminSessionsPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const sessions = await listSessionsWithDetails();

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={admin.role} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Sessions</h1>
          <p className="text-gray-600 mt-1">{sessions.length} total sessions</p>
        </div>

        <SessionsClient sessions={sessions} />
      </div>
    </div>
  );
}
