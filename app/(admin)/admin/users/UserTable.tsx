"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { AppUser } from "@/lib/db";

interface Props {
  users: AppUser[];
}

export default function UserTable({ users: initialUsers }: Props) {
  const { user: clerkUser } = useUser();
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);

  const toggle = async (
    clerkUserId: string,
    field: "is_disabled" | "role",
    value: boolean | string
  ) => {
    setLoading(clerkUserId);
    const res = await fetch(`/api/admin/users/${clerkUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.clerk_user_id === clerkUserId ? updated : u))
      );
    }
    setLoading(null);
  };

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">All Users ({users.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-6 py-3">User</th>
              <th className="text-left px-6 py-3">Role</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Joined</th>
              <th className="text-left px-6 py-3">Profile</th>
              <th className="text-left px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.clerk_user_id}
                className="border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <td className="px-6 py-4">
                  {(user.first_name || user.last_name) && (
                    <div className="text-sm text-gray-900 font-medium">
                      {[user.first_name, user.last_name].filter(Boolean).join(" ")}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      user.role === "admin"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.is_disabled
                        ? "bg-red-500/10 text-red-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {user.is_disabled ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/users/${user.clerk_user_id}`}
                    className="text-blue-400 hover:text-blue-300 text-xs"
                  >
                    View →
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        toggle(
                          user.clerk_user_id,
                          "is_disabled",
                          !user.is_disabled
                        )
                      }
                      disabled={
                        loading === user.clerk_user_id ||
                        user.clerk_user_id === clerkUser?.id
                      }
                      title={
                        user.clerk_user_id === clerkUser?.id
                          ? "Cannot disable your own account"
                          : undefined
                      }
                      className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {user.is_disabled ? "Enable" : "Disable"}
                    </button>
                    {user.role !== "admin" && (
                      <button
                        onClick={() =>
                          toggle(user.clerk_user_id, "role", "admin")
                        }
                        disabled={loading === user.clerk_user_id}
                        className="text-xs px-3 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors disabled:opacity-50"
                      >
                        Make Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users yet. Send an invitation above.
          </div>
        )}
      </div>
    </div>
  );
}
