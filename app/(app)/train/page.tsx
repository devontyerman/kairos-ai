export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { listScenarios } from "@/lib/db";
import { redirect } from "next/navigation";
import TrainClient from "./TrainClient";

export default async function TrainPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/sign-in");
  }

  const scenarios = await listScenarios();

  return (
    <TrainClient
      scenarios={scenarios}
      userClerkId={user.clerk_user_id}
      userRole={user.role}
    />
  );
}
