export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import InviteForm from "./InviteForm";
import UserTable from "./UserTable";

export default async function AdminUsersPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const users = await listUsers();

  return (
    <div className="min-h-screen bg-gray-950">
      <AppNav userRole={admin.role} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">
            Invite new users and manage existing accounts
          </p>
        </div>

        <InviteForm />
        <UserTable users={users} />
      </div>
    </div>
  );
}
