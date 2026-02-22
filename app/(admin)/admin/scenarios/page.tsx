export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { listScenarios } from "@/lib/db";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import ScenariosClient from "./ScenariosClient";

export default async function AdminScenariosPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/train");
  }

  const scenarios = await listScenarios();

  return (
    <div className="min-h-screen bg-white">
      <AppNav userRole={admin.role} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Scenarios</h1>
          <p className="text-gray-600 mt-1">
            Create and manage prospect behavior profiles
          </p>
        </div>
        <ScenariosClient initialScenarios={scenarios} />
      </div>
    </div>
  );
}
