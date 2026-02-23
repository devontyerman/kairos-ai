import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) throw new Error("CLERK_SECRET_KEY is not set");

    // Build the absolute redirect URL for the invitation link.
    // NEXT_PUBLIC_APP_URL must be set in Vercel env vars (e.g. https://kairos-ai.vercel.app).
    // Fall back to VERCEL_URL (auto-set by Vercel, no protocol prefix) if not set.
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is not configured. Add it to your Vercel environment variables." },
        { status: 500 }
      );
    }

    const redirectUrl = `${appUrl}/sign-up`;

    // Use Clerk Backend API to create an invitation
    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        redirect_url: redirectUrl,
        notify: true,
        ignore_existing: false,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to send invite" },
        { status: 400 }
      );
    }

    const invitation = await response.json();
    return NextResponse.json({ success: true, invitation });
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
