import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { clerk_user_id: string } }
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { role, is_disabled } = body;

    const updated = await updateUser(params.clerk_user_id, {
      ...(role !== undefined && { role }),
      ...(is_disabled !== undefined && { is_disabled }),
    });

    return NextResponse.json(updated);
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
