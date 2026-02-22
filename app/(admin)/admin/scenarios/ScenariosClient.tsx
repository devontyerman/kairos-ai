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
  objection_pool: string; // comma-separated
  pushback_intensity: number;
  willingness_to_commit: number;
  interrupt_frequency: number;
  success_criteria: string; // newline-separated
  client_description: string;
  client_age: string; // string for input, convert to number on save
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

const defaultForm: FormData = {
  name: "",
  product_type: "",
  difficulty: "medium",
  persona_style: "neutral",
  objection_pool: "price, trust, need-to-think",
  pushback_intensity: 5,
  willingness_to_commit: 5,
  interrupt_frequency: 2,
  success_criteria: "Build rapport\nHandle objections\nAsk for the close",
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
  const [deleting, setDeleting] = useState<string | null>(null);

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (s: Scenario) => {
    setForm({
      name: s.name,
      product_type: s.product_type,
      difficulty: s.difficulty,
      persona_style: s.persona_style,
      objection_pool: Array.isArray(s.objection_pool)
        ? s.objection_pool.join(", ")
        : "",
      pushback_intensity: s.rules.pushback_intensity ?? 5,
      willingness_to_commit: s.rules.willingness_to_commit ?? 5,
      interrupt_frequency: s.rules.interrupt_frequency ?? 2,
      success_criteria: Array.isArray(s.success_criteria)
        ? s.success_criteria.join("\n")
        : "",
      client_description: s.client_description ?? "",
      client_age: s.client_age != null ? String(s.client_age) : "",
      voice: s.voice ?? "alloy",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      product_type: form.product_type,
      difficulty: form.difficulty,
      persona_style: form.persona_style,
      objection_pool: form.objection_pool
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      rules: {
        pushback_intensity: form.pushback_intensity,
        willingness_to_commit: form.willingness_to_commit,
        interrupt_frequency: form.interrupt_frequency,
      },
      success_criteria: form.success_criteria
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      client_description: form.client_description.trim(),
      client_age: form.client_age ? parseInt(form.client_age, 10) : null,
      voice: form.voice,
    };

    const url = editingId
      ? `/api/admin/scenarios/${editingId}`
      : "/api/admin/scenarios";
    const method = editingId ? "PATCH" : "POST";

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
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scenario? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/scenarios/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    }
    setDeleting(null);
  };

  const difficultyColor = {
    easy: "text-green-400",
    medium: "text-yellow-400",
    hard: "text-red-400",
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
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Edit Scenario" : "New Scenario"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Budget-Conscious Bob"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Product Type
                </label>
                <input
                  type="text"
                  value={form.product_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, product_type: e.target.value }))
                  }
                  placeholder="SaaS Software"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Difficulty
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      difficulty: e.target.value as FormData["difficulty"],
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Persona Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    ["friendly", "neutral", "skeptical", "combative"] as const
                  ).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, persona_style: style }))
                      }
                      className={`py-2 rounded-lg text-sm capitalize transition-colors ${
                        form.persona_style === style
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Objection Pool{" "}
                  <span className="text-gray-600">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.objection_pool}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, objection_pool: e.target.value }))
                  }
                  placeholder="price, trust, need-to-think, spouse"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Behavior sliders */}
              {[
                {
                  key: "pushback_intensity" as keyof FormData,
                  label: "Pushback Intensity",
                  min: 1,
                  max: 10,
                },
                {
                  key: "willingness_to_commit" as keyof FormData,
                  label: "Willingness to Commit",
                  min: 1,
                  max: 10,
                },
                {
                  key: "interrupt_frequency" as keyof FormData,
                  label: "Interrupt Frequency",
                  min: 0,
                  max: 10,
                },
              ].map((slider) => (
                <div key={slider.key} className="col-span-2 md:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">
                    {slider.label}:{" "}
                    <span className="text-white">
                      {form[slider.key] as number}
                    </span>
                    /10
                  </label>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    value={form[slider.key] as number}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [slider.key]: parseInt(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              ))}

              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Success Criteria{" "}
                  <span className="text-gray-600">(one per line)</span>
                </label>
                <textarea
                  value={form.success_criteria}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      success_criteria: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Build rapport&#10;Handle the price objection&#10;Ask for the close"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Divider */}
              <div className="col-span-2 border-t border-gray-700/60 pt-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Prospect Character</p>
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Client Description{" "}
                  <span className="text-gray-600">(backstory, personality, job, etc.)</span>
                </label>
                <textarea
                  value={form.client_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_description: e.target.value }))
                  }
                  rows={3}
                  placeholder="e.g. Mid-level marketing manager at a 50-person company. Skeptical of new software after a bad experience with a CRM rollout last year. Values ROI and quick onboarding."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Client Age <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="number"
                  min={18}
                  max={85}
                  value={form.client_age}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_age: e.target.value }))
                  }
                  placeholder="45"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Prospect Voice
                </label>
                <select
                  value={form.voice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, voice: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Scenario"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{s.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  {s.product_type}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="text-xs px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  className="text-xs px-3 py-1 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  difficultyColor[s.difficulty]
                } bg-gray-800`}
              >
                {s.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
                {s.persona_style}
              </span>
            </div>

            {Array.isArray(s.objection_pool) && s.objection_pool.length > 0 && (
              <p className="text-gray-500 text-xs mt-2">
                Objections: {s.objection_pool.slice(0, 4).join(", ")}
                {s.objection_pool.length > 4 ? "..." : ""}
              </p>
            )}
          </div>
        ))}
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No scenarios yet. Create one above.
        </div>
      )}
    </div>
  );
}
