import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getScenario, getGlobalSettings } from "@/lib/db";
import { buildProspectSystemPrompt } from "@/lib/scenario-prompt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (user.is_disabled) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const { scenarioId } = await req.json();
    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required" },
        { status: 400 }
      );
    }

    const scenario = await getScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    const globalSettings = await getGlobalSettings();
    const systemPrompt = buildProspectSystemPrompt(scenario, globalSettings);

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

    // Request a short-lived ephemeral token from OpenAI Realtime API
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: scenario.voice || "alloy",
          instructions: systemPrompt,
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 900,
          },
          modalities: ["text", "audio"],
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI Realtime session error:", errText);
      return NextResponse.json(
        { error: "Failed to create realtime session" },
        { status: 502 }
      );
    }

    const data = await response.json();
    // data.client_secret.value is the ephemeral token
    return NextResponse.json({
      client_secret: data.client_secret,
      scenario,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    const status =
      message === "Unauthenticated"
        ? 401
        : message === "Account disabled"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
