import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listScenarios, createScenario } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const scenarios = await listScenarios();
    return NextResponse.json(scenarios);
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const scenario = await createScenario({
      name: body.name,
      product_type: body.product_type ?? "General Life Insurance",
      difficulty: body.difficulty ?? "medium",
      persona_style: body.persona_style ?? "neutral",
      objection_pool: body.objection_pool ?? [],
      rules: body.rules ?? {},
      success_criteria: body.success_criteria ?? [],
      training_objective: body.training_objective ?? "objection-handling",
      session_goal: body.session_goal ?? "close",
      behavior_notes: body.behavior_notes ?? "",
      client_description: body.client_description ?? "",
      client_age: body.client_age ?? null,
      voice: body.voice ?? "alloy",
      sales_script: body.sales_script ?? "",
    });

    return NextResponse.json(scenario, { status: 201 });
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
