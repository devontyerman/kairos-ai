export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { getGlobalSettings } from "@/lib/db";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const settings = await getGlobalSettings();

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={admin.role} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Master Controls</h1>
          <p className="text-gray-600 mt-1">
            Global overrides applied to every scenario and coaching report
          </p>
        </div>
        <SettingsClient initialSettings={settings} />
      </div>
    </div>
  );
}
