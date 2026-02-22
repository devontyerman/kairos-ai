export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/train");

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            K
          </div>
          <span className="font-semibold text-white text-lg">Kairos AI</span>
        </div>
        <Link
          href="/sign-in"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
          Real-time AI Voice Training
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 max-w-3xl leading-tight">
          Train Your Sales Team with an{" "}
          <span className="text-blue-400">AI Prospect</span>
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl">
          Practice live voice conversations with a realistic AI prospect that
          pushes back, raises objections, and behaves like a real buyer. Get
          detailed coaching reports after every session.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/sign-in"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Start Training →
          </Link>
          <span className="text-gray-500 text-sm">Invite-only access</span>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl w-full text-left">
          {[
            {
              icon: "🎙️",
              title: "Real-Time Voice",
              desc: "Talk naturally. No push-to-talk. Interrupt, be interrupted — just like a real call.",
            },
            {
              icon: "🎭",
              title: "Scenario Library",
              desc: "Train against friendly, skeptical, or combative prospects with configurable objection sets.",
            },
            {
              icon: "📊",
              title: "Coaching Reports",
              desc: "Every session ends with a detailed breakdown: strengths, weaknesses, drills, and a next-session plan.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-gray-900 border border-gray-800"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Kairos AI. All rights reserved.
      </footer>
    </main>
  );
}
