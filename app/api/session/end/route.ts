import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  endSession,
  getSession,
  getScenario,
  insertTurns,
  saveReport,
  CoachingReport,
} from "@/lib/db";

export const runtime = "nodejs";

interface TranscriptTurn {
  speaker: "agent" | "ai";
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { sessionId, transcript } = body as {
      sessionId: string;
      transcript: TranscriptTurn[];
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Ownership check
    if (session.clerk_user_id !== user.clerk_user_id && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark session ended
    await endSession(sessionId);

    // Persist transcript turns
    if (transcript && transcript.length > 0) {
      await insertTurns(sessionId, transcript);
    }

    // Generate coaching report
    const scenario = session.scenario_id
      ? await getScenario(session.scenario_id)
      : null;

    const report = await generateCoachingReport(transcript ?? [], scenario?.name ?? "Unknown Scenario");
    await saveReport(sessionId, report.overall_score, report);

    return NextResponse.json({ sessionId, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    const status = message === "Unauthenticated" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function generateCoachingReport(
  transcript: TranscriptTurn[],
  scenarioName: string
): Promise<CoachingReport> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

  const transcriptText = transcript
    .map((t) => `${t.speaker === "agent" ? "SALES REP" : "PROSPECT"}: ${t.text}`)
    .join("\n");

  const prompt = `You are an expert sales coach analyzing a training call transcript.

SCENARIO: ${scenarioName}

TRANSCRIPT:
${transcriptText || "(No transcript recorded)"}

Analyze this sales call and return a JSON coaching report. You MUST return valid JSON only — no markdown, no code blocks, no extra text.

The JSON must match this exact schema:
{
  "summary": "2-3 sentence overview of the call",
  "overall_score": <integer 0-100>,
  "strengths": ["strength 1", "strength 2"],
  "areas_to_improve": ["area 1", "area 2"],
  "objections_detected": [
    {
      "objection": "objection type (e.g. price)",
      "count": <integer>,
      "example_snippet": "exact quote from transcript",
      "handling_score": <integer 0-10>
    }
  ],
  "missed_opportunities": [
    {
      "description": "what the rep missed",
      "transcript_snippet": "relevant transcript quote"
    }
  ],
  "drills": [
    {
      "title": "drill name",
      "description": "how to practice",
      "goal": "what this improves"
    },
    {
      "title": "drill name",
      "description": "how to practice",
      "goal": "what this improves"
    },
    {
      "title": "drill name",
      "description": "how to practice",
      "goal": "what this improves"
    }
  ],
  "next_session_plan": "Concrete focus areas and goals for the next training session"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert sales coach. Return only valid JSON, no markdown.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI analysis error:", errText);
    // Return a minimal fallback report
    return fallbackReport(scenarioName);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content) as CoachingReport;
    // Ensure score is always set
    parsed.overall_score = parsed.overall_score ?? 50;
    return parsed;
  } catch {
    console.error("Failed to parse coaching report JSON:", content);
    return fallbackReport(scenarioName);
  }
}

function fallbackReport(scenarioName: string): CoachingReport {
  return {
    summary: `Training session for scenario "${scenarioName}" completed. Analysis could not be generated automatically.`,
    overall_score: 50,
    strengths: ["Completed the session"],
    areas_to_improve: ["Review the transcript manually for improvement areas"],
    objections_detected: [],
    missed_opportunities: [],
    drills: [
      {
        title: "Mirror & Label",
        description: "Practice repeating the last 3 words your prospect says and labeling their emotions.",
        goal: "Build rapport and show empathy",
      },
      {
        title: "Objection Pivot",
        description: "Write down 5 common objections and practice pivoting each to a question.",
        goal: "Handle objections without getting defensive",
      },
      {
        title: "The Silence Game",
        description: "After presenting value, stay silent for 10 seconds. Practice not filling the void.",
        goal: "Let prospects talk and reveal their real concerns",
      },
    ],
    next_session_plan:
      "Focus on listening more actively and handling the prospect's objections before attempting to close.",
  };
}
