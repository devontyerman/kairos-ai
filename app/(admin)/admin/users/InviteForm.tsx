"use client";

import { useState } from "react";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus("success");
      setMessage(`Invitation sent to ${email}`);
      setEmail("");
    } else {
      setStatus("error");
      setMessage(data.error ?? "Failed to send invitation");
    }
  };

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Send Invitation</h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
          className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {status === "loading" ? "Sending..." : "Send Invite"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
