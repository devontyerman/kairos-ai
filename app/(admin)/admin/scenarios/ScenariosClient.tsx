"use client";

import { useState } from "react";
import { Scenario } from "@/lib/db";

interface Props {
  initialScenarios: Scenario[];
}

type FormData = {
  name: string;
  product_type: string;
  difficulty: "easy" | "medium" | "hard";
  persona_style: "friendly" | "neutral" | "skeptical" | "combative";
  objection_pool: string[];
  pushback_intensity: number;
  willingness_to_commit: number;
  interrupt_frequency: number;
  behavior_notes: string;
  training_objective: string;
  session_goal: "close" | "appointment";
  client_description: string;
  client_age: string;
  voice: string;
};

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "ash", label: "Ash (Male)" },
  { value: "coral", label: "Coral (Female)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "shimmer", label: "Shimmer (Female)" },
  { value: "sage", label: "Sage (Female)" },
];

const PRODUCT_TYPES = [
  "Final Expense",
  "Mortgage Protection",
  "Ethos Leads",
  "General Life Insurance",
];

const LIFE_INSURANCE_OBJECTIONS = [
  "Too expensive — can't afford the premiums",
  "Need to think about it more",
  "Need to talk to my spouse first",
  "Too young — don't need it yet",
  "Already have coverage through work",
  "I'm healthy, I don't think I need it",
  "Don't trust insurance companies",
  "Don't want to think about death",
  "It's too complicated to understand",
  "I'll get around to it later",
  "My family told me not to bother",
  "I already have savings — I'm self-insured",
  "Worried the company won't actually pay out",
  "Had a bad experience with insurance before",
  "I don't believe my family would really need it",
];

const TRAINING_OBJECTIVES = [
  {
    value: "rapport-building",
    label: "Rapport Building",
    description: "Higher score for establishing genuine personal connection and trust early in the call.",
  },
  {
    value: "needs-discovery",
    label: "Needs Discovery",
    description: "Higher score for uncovering the prospect's coverage needs, family situation, and motivations.",
  },
  {
    value: "objection-handling",
    label: "Objection Handling",
    description: "Higher score for professionally overcoming multiple objections throughout the call.",
  },
  {
    value: "price-objection",
    label: "Price Objection Mastery",
    description: "Higher score for navigating affordability concerns and demonstrating value over cost.",
  },
  {
    value: "one-call-close",
    label: "One-Call Closing",
    description: "Higher score for driving the prospect to a commitment and policy decision on the first call.",
  },
  {
    value: "urgency-creation",
    label: "Creating Urgency",
    description: "Higher score for helping the prospect feel the real-world consequence of delaying coverage.",
  },
  {
    value: "spouse-objection",
    label: "Spouse / Third-Party Objection",
    description: "Higher score for successfully handling \"I need to talk to my spouse first.\"",
  },
  {
    value: "product-presentation",
    label: "Product Presentation",
    description: "Higher score for clearly and compellingly explaining coverage options and benefits.",
  },
  {
    value: "re-engaging-leads",
    label: "Re-engaging Cold Leads",
    description: "Higher score for reviving interest from a prospect who forgot they filled out a form.",
  },
  {
    value: "referral-generation",
    label: "Referral Generation",
    description: "Higher score for asking for and successfully obtaining referrals during the conversation.",
  },
];

const defaultForm: FormData = {
  name: "",
  product_type: "General Life Insurance",
  difficulty: "medium",
  persona_style: "neutral",
  objection_pool: [],
  pushback_intensity: 5,
  willingness_to_commit: 5,
  interrupt_frequency: 2,
  behavior_notes: "",
  training_objective: "objection-handling",
  session_goal: "close",
  client_description: "",
  client_age: "",
  voice: "alloy",
};

export default function ScenariosClient({ initialScenarios }: Props) {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (s: Scenario) => {
    setForm({
      name: s.name,
      product_type: s.product_type,
      difficulty: s.difficulty,
      persona_style: s.persona_style,
      objection_pool: Array.isArray(s.objection_pool) ? s.objection_pool : [],
      pushback_intensity: s.rules.pushback_intensity ?? 5,
      willingness_to_commit: s.rules.willingness_to_commit ?? 5,
      interrupt_frequency: s.rules.interrupt_frequency ?? 2,
      behavior_notes: s.behavior_notes ?? "",
      training_objective: s.training_objective ?? "objection-handling",
      session_goal: s.session_goal ?? "close",
      client_description: s.client_description ?? "",
      client_age: s.client_age != null ? String(s.client_age) : "",
      voice: s.voice ?? "alloy",
    });
    setEditingId(s.id);
    setFormError(null);
    setShowForm(true);
  };

  const toggleObjection = (obj: string) => {
    setForm((f) => {
      const already = f.objection_pool.includes(obj);
      return {
        ...f,
        objection_pool: already
          ? f.objection_pool.filter((o) => o !== obj)
          : [...f.objection_pool, obj],
      };
    });
  };

  const handleSave = async () => {
    setFormError(null);
    setSaving(true);

    const payload = {
      name: form.name,
      product_type: form.product_type,
      difficulty: form.difficulty,
      persona_style: form.persona_style,
      objection_pool: form.objection_pool,
      rules: {
        pushback_intensity: form.pushback_intensity,
        willingness_to_commit: form.willingness_to_commit,
        interrupt_frequency: form.interrupt_frequency,
      },
      success_criteria: [],
      training_objective: form.training_objective,
      session_goal: form.session_goal,
      behavior_notes: form.behavior_notes.trim(),
      client_description: form.client_description.trim(),
      client_age: form.client_age ? parseInt(form.client_age, 10) : null,
      voice: form.voice,
    };

    const url = editingId
      ? `/api/admin/scenarios/${editingId}`
      : "/api/admin/scenarios";
    const method = editingId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        if (editingId) {
          setScenarios((prev) =>
            prev.map((s) => (s.id === editingId ? saved : s))
          );
        } else {
          setScenarios((prev) => [...prev, saved]);
        }
        setShowForm(false);
        setEditingId(null);
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setFormError(err.error ?? `Save failed (${res.status})`);
      }
    } catch {
      setFormError("Network error — could not save scenario");
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scenario? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/scenarios/${id}`, { method: "DELETE" });
    if (res.ok) {
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    }
    setDeleting(null);
  };

  const difficultyColor = {
    easy: "text-green-600",
    medium: "text-yellow-600",
    hard: "text-red-500",
  };

  return (
    <div className="space-y-4">
      <button
        onClick={openCreate}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
      >
        + New Scenario
      </button>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? "Edit Scenario" : "New Scenario"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            {/* ── Basic Info ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Scenario Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Budget-Conscious Bob"
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Product Type</label>
                  <select
                    value={form.product_type}
                    onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value }))}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {PRODUCT_TYPES.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, difficulty: e.target.value as FormData["difficulty"] }))
                    }
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Session Goal ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session Goal</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, session_goal: "close" }))}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    form.session_goal === "close"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="text-lg mb-1">🤝</div>
                  <div className="font-semibold text-gray-900 text-sm">Close on the Call</div>
                  <div className="text-gray-500 text-xs mt-1">Rep aims to get a policy commitment during this call.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, session_goal: "appointment" }))}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    form.session_goal === "appointment"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="text-lg mb-1">📅</div>
                  <div className="font-semibold text-gray-900 text-sm">Set an Appointment</div>
                  <div className="text-gray-500 text-xs mt-1">Rep aims to schedule a specific follow-up meeting.</div>
                </button>
              </div>
            </div>

            {/* ── Training Objective ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Training Objective</p>
              <p className="text-xs text-gray-500">Select the primary skill area. Reps are scored higher for excelling in this specific area.</p>
              <select
                value={form.training_objective}
                onChange={(e) => setForm((f) => ({ ...f, training_objective: e.target.value }))}
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
              >
                {TRAINING_OBJECTIVES.map((obj) => (
                  <option key={obj.value} value={obj.value}>
                    {obj.label} — {obj.description}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Persona ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prospect Persona</p>
              <div>
                <label className="block text-xs text-gray-600 mb-2">Persona Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["friendly", "neutral", "skeptical", "combative"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, persona_style: style }))}
                      className={`py-2 rounded-lg text-sm capitalize transition-colors ${
                        form.persona_style === style
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Objection Pool ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Objection Pool{" "}
                <span className="normal-case font-normal text-gray-400">
                  — {form.objection_pool.length} selected
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {LIFE_INSURANCE_OBJECTIONS.map((obj) => {
                  const selected = form.objection_pool.includes(obj);
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => toggleObjection(obj)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors text-left ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {selected && "✓ "}
                      {obj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Behavior Sliders ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Behavior Sliders</p>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: "pushback_intensity" as keyof FormData, label: "Pushback Intensity", min: 1, max: 10 },
                  { key: "willingness_to_commit" as keyof FormData, label: "Willingness to Commit", min: 1, max: 10 },
                  { key: "interrupt_frequency" as keyof FormData, label: "Interrupt Frequency", min: 0, max: 10 },
                ].map((slider) => (
                  <div key={slider.key}>
                    <label className="block text-xs text-gray-600 mb-1">
                      {slider.label}:{" "}
                      <span className="text-gray-900 font-medium">{form[slider.key] as number}</span>/10
                    </label>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      value={form[slider.key] as number}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [slider.key]: parseInt(e.target.value) }))
                      }
                      className="w-full accent-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Prospect Behavior Notes ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prospect Behavior</p>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Custom Behavior Instructions{" "}
                  <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={form.behavior_notes}
                  onChange={(e) => setForm((f) => ({ ...f, behavior_notes: e.target.value }))}
                  rows={3}
                  placeholder={
                    "e.g. \"This prospect has a sick spouse but won't mention it unless asked directly. " +
                    "They become more open once they feel heard. " +
                    "They will hang up if the rep seems pushy in the first 60 seconds.\""
                  }
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-y"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Use this to add hidden backstory, specific reactions, triggers, or behavioral quirks that make the prospect more realistic.
                </p>
              </div>
            </div>

            {/* ── Prospect Character ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prospect Character</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Client Description{" "}
                    <span className="text-gray-400">(backstory, personality, job, etc.)</span>
                  </label>
                  <textarea
                    value={form.client_description}
                    onChange={(e) => setForm((f) => ({ ...f, client_description: e.target.value }))}
                    rows={3}
                    placeholder="e.g. 42-year-old father of two, works in construction. Cares deeply about his family but hasn't updated coverage since his kids were born."
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Client Age <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={85}
                    value={form.client_age}
                    onChange={(e) => setForm((f) => ({ ...f, client_age: e.target.value }))}
                    placeholder="45"
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Prospect Voice</label>
                  <select
                    value={form.voice}
                    onChange={(e) => setForm((f) => ({ ...f, voice: e.target.value }))}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Scenario"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((s) => {
          const objective = TRAINING_OBJECTIVES.find((o) => o.value === s.training_objective);
          return (
            <div key={s.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{s.product_type}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="text-xs px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs mb-2">
                <span className={`px-2 py-0.5 rounded-full font-medium ${difficultyColor[s.difficulty]} bg-gray-100`}>
                  {s.difficulty}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                  {s.persona_style}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  s.session_goal === "close"
                    ? "bg-green-50 text-green-700"
                    : "bg-purple-50 text-purple-700"
                }`}>
                  {s.session_goal === "close" ? "🤝 Close" : "📅 Appointment"}
                </span>
              </div>

              {objective && (
                <p className="text-blue-600 text-xs font-medium mb-1">🎯 {objective.label}</p>
              )}

              {Array.isArray(s.objection_pool) && s.objection_pool.length > 0 && (
                <p className="text-gray-500 text-xs">
                  Objections: {s.objection_pool.slice(0, 2).join(", ")}
                  {s.objection_pool.length > 2 ? ` +${s.objection_pool.length - 2} more` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No scenarios yet. Create one above.
        </div>
      )}
    </div>
  );
}
