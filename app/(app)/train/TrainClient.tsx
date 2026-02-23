"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scenario } from "@/lib/db";
import AppNav from "@/components/AppNav";

interface TranscriptTurn {
  speaker: "agent" | "ai";
  text: string;
  id: string;
}

interface Props {
  scenarios: Scenario[];
  userClerkId: string;
  userRole: "admin" | "agent";
}

type SessionState =
  | "idle"
  | "connecting"
  | "connected"
  | "ai_speaking"
  | "agent_speaking"
  | "ending";

export default function TrainClient({ scenarios, userRole }: Props) {
  const router = useRouter();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    scenarios[0]?.id ?? ""
  );
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Ready");

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<TranscriptTurn[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  // Track time of last agent transcription to merge consecutive bubbles
  const lastAgentTurnTimeRef = useRef<number>(0);

  // Keep transcriptRef in sync for use in callbacks
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const addTurn = useCallback((speaker: "agent" | "ai", text: string) => {
    if (!text.trim()) return;
    const turn: TranscriptTurn = {
      speaker,
      text: text.trim(),
      id: `${Date.now()}-${Math.random()}`,
    };
    setTranscript((prev) => {
      // Merge with previous turn from same speaker if very recent (streaming)
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker && last.id === turn.id) {
        return prev;
      }
      return [...prev, turn];
    });
  }, []);

  const updateLastTurn = useCallback(
    (speaker: "agent" | "ai", text: string) => {
      setTranscript((prev) => {
        if (prev.length === 0) {
          const turn: TranscriptTurn = {
            speaker,
            text,
            id: `stream-${speaker}`,
          };
          return [turn];
        }
        const last = prev[prev.length - 1];
        if (last.speaker === speaker) {
          return [...prev.slice(0, -1), { ...last, text }];
        }
        return [
          ...prev,
          { speaker, text, id: `stream-${speaker}-${Date.now()}` },
        ];
      });
    },
    []
  );

  const handleDataChannelMessage = useCallback(
    (event: MessageEvent) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {
        case "session.updated":
          setStatusLabel("Connected");
          break;

        case "input_audio_buffer.speech_started":
          setSessionState("agent_speaking");
          setStatusLabel("Listening...");
          break;

        case "input_audio_buffer.speech_stopped":
          setStatusLabel("Processing...");
          break;

        case "response.audio.started":
        case "response.created":
          setSessionState("ai_speaking");
          setStatusLabel("Prospect speaking...");
          break;

        case "response.audio.done":
        case "response.done":
          setSessionState("connected");
          setStatusLabel("Your turn");
          break;

        // Transcript: user speech — merge consecutive utterances into one bubble
        case "conversation.item.input_audio_transcription.completed": {
          const text = (msg.transcript as string) ?? "";
          if (!text) break;
          const now = Date.now();
          const elapsed = now - lastAgentTurnTimeRef.current;
          lastAgentTurnTimeRef.current = now;
          if (elapsed < 2000) {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last?.speaker === "agent") {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + " " + text },
                ];
              }
              return [...prev, { speaker: "agent", text, id: `agent-${now}` }];
            });
          } else {
            addTurn("agent", text);
          }
          break;
        }

        // Transcript: AI speech (streaming deltas)
        case "response.audio_transcript.delta": {
          const delta = (msg.delta as string) ?? "";
          if (delta) {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last?.speaker === "ai") {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + delta },
                ];
              }
              return [
                ...prev,
                {
                  speaker: "ai",
                  text: delta,
                  id: `ai-${Date.now()}`,
                },
              ];
            });
          }
          break;
        }

        // Transcript: AI speech (final)
        case "response.audio_transcript.done": {
          const text = (msg.transcript as string) ?? "";
          if (text) updateLastTurn("ai", text);
          break;
        }

        case "error": {
          const errMsg = (msg.message as string) ?? "Realtime API error";
          setError(errMsg);
          break;
        }
      }
    },
    [addTurn, updateLastTurn]
  );

  const startSession = useCallback(async () => {
    setError(null);
    setSessionState("connecting");
    setStatusLabel("Connecting...");
    setTranscript([]);

    try {
      // 1. Mint realtime token from server
      const tokenRes = await fetch("/api/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedScenarioId }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error ?? "Failed to get realtime token");
      }

      const { client_secret } = await tokenRes.json();
      const ephemeralKey = client_secret?.value;
      if (!ephemeralKey) throw new Error("Invalid token response");

      // 2. Create a session record
      const sessionRes = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedScenarioId }),
      });

      if (!sessionRes.ok) throw new Error("Failed to start session");
      const { sessionId: sid } = await sessionRes.json();
      setSessionId(sid);

      // 3. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 4. Set up WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add audio output element
      if (!audioRef.current) {
        audioRef.current = document.createElement("audio");
        audioRef.current.autoplay = true;
        document.body.appendChild(audioRef.current);
      }

      pc.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      // Add mic track
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      // 5. Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", handleDataChannelMessage);
      dc.addEventListener("open", () => {
        setSessionState("ai_speaking");
        setStatusLabel("Prospect answering...");
        // Trigger the prospect to "answer the phone" and speak first
        dc.send(JSON.stringify({ type: "response.create" }));
      });

      // 6. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Send offer to OpenAI Realtime API
      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) {
        const sdpErr = await sdpRes.text();
        throw new Error(`SDP exchange failed: ${sdpErr}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      setError(msg);
      setSessionState("idle");
      setStatusLabel("Ready");
      stopStream();
    }
  }, [selectedScenarioId, handleDataChannelMessage]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  };

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setSessionState("ending");
    setStatusLabel("Generating report...");

    stopStream();

    try {
      const res = await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          transcript: transcriptRef.current.map(({ speaker, text }) => ({
            speaker,
            text,
          })),
        }),
      });

      if (res.ok) {
        router.push(`/results/${sessionId}`);
      } else {
        throw new Error("Failed to end session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
      setSessionState("idle");
    }
  }, [sessionId, router]);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);
  const isActive = ["connected", "ai_speaking", "agent_speaking"].includes(
    sessionState
  );

  const difficultyColor = {
    easy: "text-green-600 bg-green-50",
    medium: "text-yellow-600 bg-yellow-50",
    hard: "text-red-500 bg-red-50",
  };

  const personaColor = {
    friendly: "text-blue-600",
    neutral: "text-gray-500",
    skeptical: "text-orange-500",
    combative: "text-red-500",
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AppNav userRole={userRole} />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 py-6 gap-6">
        {/* Left: Scenario Selection + Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Select Scenario</h2>

            <div className="space-y-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    !isActive && setSelectedScenarioId(s.id)
                  }
                  disabled={isActive}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedScenarioId === s.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  } ${isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        difficultyColor[s.difficulty] ??
                        "text-gray-600 bg-gray-200"
                      }`}
                    >
                      {s.difficulty}
                    </span>
                    <span
                      className={`text-xs ${personaColor[s.persona_style] ?? "text-gray-500"}`}
                    >
                      {s.persona_style}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {scenarios.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                No scenarios yet. Ask an admin to create one.
              </p>
            )}
          </div>

          {/* Scenario detail */}
          {selectedScenario && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-sm">
              <h3 className="font-medium text-gray-700 mb-3">
                Scenario Details
              </h3>
              <div className="space-y-2 text-gray-600">
                <div>
                  <span className="text-gray-500">Product:</span>{" "}
                  {selectedScenario.product_type}
                </div>
                <div>
                  <span className="text-gray-500">Objections:</span>{" "}
                  {Array.isArray(selectedScenario.objection_pool)
                    ? selectedScenario.objection_pool.join(", ")
                    : "—"}
                </div>
                {selectedScenario.client_description?.trim() && (
                  <div className="mt-1">
                    <span className="text-gray-500">About:</span>{" "}
                    {selectedScenario.client_description}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start/End button */}
          <div className="space-y-3">
            {!isActive && sessionState !== "ending" && (
              <button
                onClick={startSession}
                disabled={
                  !selectedScenarioId || sessionState === "connecting"
                }
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20"
              >
                {sessionState === "connecting"
                  ? "Connecting..."
                  : "Start Session"}
              </button>
            )}

            {isActive && (
              <button
                onClick={endSession}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors"
              >
                End Session & Get Report
              </button>
            )}

            {sessionState === "ending" && (
              <div className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold text-center">
                Generating report...
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right: Live transcript + status */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Status bar */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                sessionState === "idle" || sessionState === "connecting"
                  ? "bg-gray-400"
                  : sessionState === "agent_speaking"
                    ? "bg-green-500 animate-pulse"
                    : sessionState === "ai_speaking"
                      ? "bg-blue-500 animate-pulse"
                      : sessionState === "ending"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-green-500"
              }`}
            />
            <span className="text-gray-700 text-sm font-medium">
              {statusLabel}
            </span>
            {isActive && (
              <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Live
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 p-5 overflow-y-auto min-h-0 max-h-[60vh] lg:max-h-none">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="text-5xl mb-4">🎙️</div>
                <p className="text-gray-600 text-lg font-medium">
                  Ready to train
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Select a scenario and press Start Session to begin a live
                  voice conversation with your AI prospect.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transcript.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex gap-3 ${turn.speaker === "agent" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        turn.speaker === "agent"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {turn.speaker === "agent" ? "You" : "AI"}
                    </div>
                    <div
                      className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        turn.speaker === "agent"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {turn.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>

          {/* Legend */}
          {isActive && (
            <div className="flex items-center gap-6 text-xs text-gray-400 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Listening
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                AI Speaking
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Idle
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
