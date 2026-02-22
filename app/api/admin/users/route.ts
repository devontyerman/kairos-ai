import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    const status =
      message === "Unauthenticated"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
