import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  endSession,
  getSession,
  getScenario,
  getGlobalSettings,
  insertTurns,
  saveReport,
  CoachingReport,
} from "@/lib/db";
import { getObjectiveLabel } from "@/lib/scenario-prompt";

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

    const globalSettings = await getGlobalSettings();
    const report = await generateCoachingReport(transcript ?? [], scenario, globalSettings);
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
  scenario: Awaited<ReturnType<typeof getScenario>>,
  globalSettings?: { master_coaching_notes?: string; master_objection_responses?: Record<string, string> }
): Promise<CoachingReport> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

  const scenarioName = scenario?.name ?? "Unknown Scenario";
  const trainingObjective = scenario?.training_objective ?? "objection-handling";
  const objectiveLabel = getObjectiveLabel(trainingObjective);
  const sessionGoal = scenario?.session_goal ?? "close";

  const transcriptText = transcript
    .map((t) => `${t.speaker === "agent" ? "SALES REP" : "PROSPECT"}: ${t.text}`)
    .join("\n");

  const goalContext = sessionGoal === "close"
    ? "The rep's goal was to CLOSE the policy on this call."
    : "The rep's goal was to SET AN APPOINTMENT for a follow-up meeting.";

  const prompt = `You are an expert life insurance sales coach analyzing a training call transcript.

SCENARIO: ${scenarioName}
PRODUCT: ${scenario?.product_type ?? "Life Insurance"}
${goalContext}

TRAINING OBJECTIVE — WEIGHT SCORING HERE:
The primary skill being trained this session is: "${objectiveLabel}"
When scoring this call, give significantly higher weight to how well the rep performed in this specific area. Strengths, areas to improve, missed opportunities, and drills should all be oriented toward this objective where relevant.
${globalSettings?.master_coaching_notes?.trim() ? `\nADDITIONAL COACHING INSTRUCTIONS (apply to every session report):\n${globalSettings.master_coaching_notes.trim()}\n` : ""}${scenario?.sales_script?.trim() ? `
SALES SCRIPT — EVALUATE ADHERENCE:
The following is the approved sales script/talk track for this scenario. Score how closely the rep followed this general flow, key questions, and word tracks. They do NOT need to follow it word-for-word, but should hit the main points, use similar language, and follow the general structure.

${scenario.sales_script.trim()}

Include "script_adherence_score" (0-100) and "script_adherence_notes" (2-3 sentences explaining what they followed well and what they missed or skipped from the script). Also reference the script in strengths, areas_to_improve, and drills where relevant — note when the rep used good word tracks from the script and when they deviated.
` : ""}${(() => {
    const responses = globalSettings?.master_objection_responses ?? {};
    const entries = Object.entries(responses).filter(([, v]) => v.trim());
    if (entries.length === 0) return "";
    return `
APPROVED OBJECTION RESPONSES — USE THESE IN FEEDBACK:
When the rep encounters these objections, evaluate whether they used language similar to the approved responses below. Reference these in your feedback, drills, and example_scripts. If the rep handled an objection poorly, show them the suggested response.

${entries.map(([obj, resp]) => `Objection: "${obj}"\nSuggested Response: "${resp}"`).join("\n\n")}
`;
  })()}
TRANSCRIPT:
${transcriptText || "(No transcript recorded)"}

Analyze this life insurance sales call and return a JSON coaching report. You MUST return valid JSON only — no markdown, no code blocks, no extra text.

The JSON must match this exact schema:
{
  "summary": "A 3-5 sentence paragraph covering: (1) the context of the call — who the rep was calling and why, (2) how the prospect responded overall, and (3) an overall impression of how the call went and whether the rep achieved the session goal. Be specific to THIS call, not generic.",
  "overall_score": <integer 0-100, weighted heavily toward performance on the training objective>,
  "strengths": [
    "Each strength MUST be 2-3 sentences. Quote the rep's exact words from the transcript that demonstrate the strength, then explain WHY it was effective. Example format: 'The rep did a great job of [skill] when they said \"[exact quote from transcript].\" This was effective because [reason].'",
    "Return 2-4 strengths, each with a specific transcript quote and explanation"
  ],
  "areas_to_improve": [
    "Each weakness MUST be 2-3 sentences. Quote the rep's exact words from the transcript, then explain what the risk or impact was. Example format: 'The rep [description of mistake] when they said \"[exact quote from transcript].\" This could [negative impact] because [reason].'",
    "Return 2-4 areas to improve, each with a specific transcript quote and explanation"
  ],
  "objections_detected": [
    {
      "objection": "objection type (e.g. price, spouse, need to think)",
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
      "title": "specific drill name tied to an observed weakness",
      "description": "Step-by-step instructions referencing the EXACT moment in the transcript where the rep struggled. Quote the specific line, explain what went wrong, and describe how to practice fixing it.",
      "goal": "the specific skill this improves, tied to the training objective",
      "example_script": "A word-for-word script the rep should practice saying instead. Write it as if the rep is speaking directly to the prospect in that exact scenario moment."
    }
  ],

  CRITICAL DRILL INSTRUCTIONS:
  - Return exactly 3 drills
  - Each drill MUST reference a specific moment from the transcript — quote the rep's actual words that need improvement
  - Each drill MUST include an example_script with a word-for-word alternative the rep should practice
  - Do NOT give generic advice like "practice active listening" — instead say exactly WHAT to say and WHEN
  - Tie each drill to a specific weakness you identified, not to general sales theory
  - If approved objection responses were provided above, use them as the basis for example_scripts when relevant
  ${scenario?.sales_script?.trim() ? `"script_adherence_score": <integer 0-100, how closely the rep followed the approved sales script>,
  "script_adherence_notes": "2-3 sentences explaining what parts of the script the rep followed well, what they skipped or missed, and whether they hit the key word tracks and questions",` : ""}
  "next_session_plan": "Concrete focus areas and goals for the next training session, tied to the training objective"
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
            "You are an expert life insurance sales coach. Return only valid JSON, no markdown.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI analysis error:", errText);
    return fallbackReport(scenarioName);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content) as CoachingReport;
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
        example_script: "It sounds like you're feeling uncertain about the timing. Tell me more about what's holding you back.",
      },
      {
        title: "Objection Pivot",
        description: "Write down 5 common objections and practice pivoting each to a question.",
        goal: "Handle objections without getting defensive",
        example_script: "I completely understand that concern. Let me ask you this — if we could find a plan that fits your budget, would that change how you feel about moving forward today?",
      },
      {
        title: "The Silence Game",
        description: "After presenting value, stay silent for 10 seconds. Practice not filling the void.",
        goal: "Let prospects talk and reveal their real concerns",
        example_script: "So based on everything we've discussed, this plan gives your family $250,000 in protection for just $45 a month. [PAUSE — wait for prospect to respond]",
      },
    ],
    next_session_plan:
      "Focus on listening more actively and handling the prospect's objections before attempting to close.",
  };
}
