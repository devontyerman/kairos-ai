"use client";

import { useState, useEffect } from "react";
import { GlobalSettings } from "@/lib/db";
import { LIFE_INSURANCE_OBJECTIONS } from "@/lib/objections";

interface Props {
  initialSettings: GlobalSettings;
}

export default function SettingsClient({ initialSettings }: Props) {
  const [form, setForm] = useState({
    master_prospect_behavior: initialSettings.master_prospect_behavior,
    master_conversation_style: initialSettings.master_conversation_style,
    master_coaching_notes: initialSettings.master_coaching_notes,
  });
  const [objectionResponses, setObjectionResponses] = useState<Record<string, string>>(
    initialSettings.master_objection_responses ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          master_objection_responses: objectionResponses,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setForm({
          master_prospect_behavior: updated.master_prospect_behavior,
          master_conversation_style: updated.master_conversation_style,
          master_coaching_notes: updated.master_coaching_notes,
        });
        setObjectionResponses(updated.master_objection_responses ?? {});
        setSaved(true);
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setFormError(err.error ?? "Save failed");
      }
    } catch {
      setFormError("Network error — could not save settings");
    }

    setSaving(false);
  };

  const fields = [
    {
      key: "master_prospect_behavior" as const,
      label: "Master Prospect Behavior",
      placeholder:
        'e.g. "Never agree to a policy on the first ask — always push back at least once. Mention budget concerns early in the call."',
      helper:
        "These instructions are injected into every prospect's system prompt, across all scenarios.",
    },
    {
      key: "master_conversation_style" as const,
      label: "Master Conversation Style",
      placeholder:
        'e.g. "Use a Southern dialect. Keep responses under 40 words. Be more hesitant and use longer pauses."',
      helper:
        "Overrides how the AI prospect talks — tone, length, dialect, and conversational habits.",
    },
    {
      key: "master_coaching_notes" as const,
      label: "Master Coaching Notes",
      placeholder:
        'e.g. "Be stricter with scoring — only give 80+ if the rep truly excelled. Focus feedback on closing technique and urgency creation."',
      helper:
        "Controls how the post-call coaching report is generated — scoring strictness, feedback focus, and analysis priorities.",
    },
  ];

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div
          key={field.key}
          className="bg-gray-50 rounded-2xl border border-gray-200 p-6"
        >
          <label className="block text-sm font-semibold text-gray-900 mb-1">
            {field.label}
          </label>
          <p className="text-xs text-gray-500 mb-3">{field.helper}</p>
          <textarea
            value={form[field.key]}
            onChange={(e) =>
              setForm((f) => ({ ...f, [field.key]: e.target.value }))
            }
            rows={4}
            placeholder={field.placeholder}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-y"
          />
        </div>
      ))}

      {/* Objection Response Guide */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-900 mb-1">
          Objection Response Guide
        </label>
        <p className="text-xs text-gray-500 mb-4">
          Type your suggested responses for each objection. The coaching feedback will reference these when advising reps on how to handle objections.
        </p>
        <div className="space-y-4">
          {LIFE_INSURANCE_OBJECTIONS.map((objection) => (
            <div key={objection}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {objection}
              </label>
              <textarea
                value={objectionResponses[objection] ?? ""}
                onChange={(e) =>
                  setObjectionResponses((prev) => ({
                    ...prev,
                    [objection]: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Type your suggested response for this objection..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>
          ))}
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {formError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span className="text-green-600 text-sm font-medium">Saved</span>
        )}
      </div>
    </div>
  );
}
