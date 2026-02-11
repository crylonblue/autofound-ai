"use client";

import { useState, FormEvent } from "react";

/* ───────────────────────── helpers ───────────────────────── */

function saveEmail(email: string) {
  const list = JSON.parse(localStorage.getItem("waitlist") || "[]");
  list.push({ email, ts: Date.now() });
  localStorage.setItem("waitlist", JSON.stringify(list));
}

/* ───────────────────────── components ───────────────────────── */

function WaitlistForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    saveEmail(email);
    setDone(true);
    setEmail("");
  }

  if (done)
    return (
      <p className="text-blue-400 font-medium">
        🎉 You&apos;re on the list. We&apos;ll be in touch.
      </p>
    );

  return (
    <form onSubmit={handle} className={`flex gap-3 ${className}`}>
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 max-w-xs px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
      />
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition cursor-pointer"
      >
        Join waitlist
      </button>
    </form>
  );
}

/* ───────────────────────── data ───────────────────────── */

const steps = [
  {
    n: "01",
    title: "Hire agent templates",
    desc: "Browse a library of pre-built roles — CEO, Marketing, Sales, Finance, Engineering, Support. Each comes with tools, prompts, and default behaviors.",
  },
  {
    n: "02",
    title: "Build your org chart",
    desc: "Drag-and-drop hierarchy builder. Define who reports to whom, communication channels, escalation paths, and approval gates.",
  },
  {
    n: "03",
    title: "Let them work",
    desc: "Agents execute real tasks — write content, research leads, manage expenses, deploy code. Not advice. Actual output.",
  },
];

const agents = [
  { emoji: "👔", role: "CEO Agent", desc: "Reviews reports, sets priorities, delegates across departments.", task: "\"Summarize this week's KPIs and assign Q2 OKRs.\"" },
  { emoji: "✍️", role: "Content Writer", desc: "Writes blog posts, landing pages, newsletters, and social copy.", task: "\"Write a 1,500-word SEO article about AI automation.\"" },
  { emoji: "🔍", role: "SEO Specialist", desc: "Runs audits, researches keywords, optimizes content.", task: "\"Audit our top 10 pages and suggest improvements.\"" },
  { emoji: "📞", role: "Sales Agent", desc: "Researches leads, sends outreach, updates your CRM.", task: "\"Find 50 SaaS founders in Berlin and draft cold emails.\"" },
  { emoji: "📊", role: "Bookkeeper", desc: "Categorizes expenses, generates invoices, flags anomalies.", task: "\"Reconcile last month's transactions and export a P&L.\"" },
  { emoji: "🧑‍💼", role: "HR Manager", desc: "Monitors agent performance, spawns new agents when workload grows.", task: "\"Spin up two more writers — content backlog is growing.\"" },
  { emoji: "💻", role: "Dev Agent", desc: "Writes code, runs tests, deploys to staging or production.", task: "\"Fix the auth bug in PR #42 and deploy to staging.\"" },
  { emoji: "🎧", role: "Support Agent", desc: "Triages tickets, drafts replies, escalates complex issues.", task: "\"Respond to all open Zendesk tickets from today.\"" },
];

const pricing = [
  { name: "Starter", price: "Free", sub: "forever", agents: "3 agents", features: ["Basic org chart", "Community templates", "BYOK"] },
  { name: "Growth", price: "$29", sub: "/month", agents: "15 agents", features: ["Custom templates", "Advanced comm rules", "Priority support"], popular: true },
  { name: "Business", price: "$79", sub: "/month", agents: "Unlimited agents", features: ["API access", "Team collaboration", "Priority execution"] },
];

const comparisons = [
  { them: "Single chatbot", us: "Full AI org chart" },
  { them: "You orchestrate everything", us: "Agents collaborate autonomously" },
  { them: "Flat, no structure", us: "Hierarchical delegation & escalation" },
  { them: "Locked to one provider", us: "BYOK — bring your own API keys" },
  { them: "\"Here's what you could do…\"", us: "Real execution, real output" },
];

/* ───────────────────────── page ───────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            autofound<span className="text-blue-500">.ai</span>
          </span>
          <div className="hidden sm:flex gap-8 text-sm text-zinc-400">
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#agents" className="hover:text-white transition">Agents</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>
          <a
            href="#waitlist"
            className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition"
          >
            Join waitlist
          </a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] animate-fade-in-up">
            Your first employees
            <br />
            <span className="text-blue-500">are AI.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
            Build and run your company with AI agent teams. Hire roles, define
            org charts, and let them execute real work — autonomously.
          </p>
          <div className="mt-10 flex justify-center animate-fade-in-up animate-delay-200">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-sm text-zinc-600 animate-fade-in-up animate-delay-300">
            Free to start · No credit card required · BYOK
          </p>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="group">
                <span className="text-blue-500 font-mono text-sm">{s.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Org chart ─── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Your AI org chart
          </h2>
          <p className="text-zinc-400 mb-12 max-w-xl mx-auto">
            Define hierarchy, communication channels, and escalation paths.
            Agents know who to report to and who to delegate to.
          </p>
          <div className="inline-block text-left font-mono text-sm sm:text-base leading-relaxed glow rounded-2xl border border-white/10 bg-white/[0.02] px-8 sm:px-12 py-10">
            <div className="text-zinc-400">
              <span className="text-zinc-300">{"            "}👤 You</span> <span className="text-zinc-600">(Founder)</span>
              <br />
              {"             "}│
              <br />
              <span className="text-blue-400">{"          "}🤖 CEO Agent</span>
              <br />
              {"        "}┌──────┼──────┐
              <br />
              <span className="text-emerald-400">{"     "}🤖 CMO</span>{"   "}
              <span className="text-amber-400">🤖 CFO</span>{"   "}
              <span className="text-purple-400">🤖 CTO</span>
              <br />
              {"     "}┌─┴─┐{"    "}│{"    "}┌─┴─┐
              <br />
              {"   "}
              <span className="text-emerald-400/70">✍️ Writer</span>{" "}
              <span className="text-emerald-400/70">🔍 SEO</span>{"  "}
              <span className="text-amber-400/70">📊 Books</span>{"  "}
              <span className="text-purple-400/70">💻 Dev</span>{" "}
              <span className="text-purple-400/70">🧪 QA</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Agent templates ─── */}
      <section id="agents" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Agent templates
          </h2>
          <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
            Pre-built roles with system prompts, tools, and default behaviors.
            Customize or create your own.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((a) => (
              <div
                key={a.role}
                className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-blue-500/30 hover:bg-white/[0.04] transition group"
              >
                <div className="text-3xl mb-3">{a.emoji}</div>
                <h3 className="font-semibold text-white">{a.role}</h3>
                <p className="mt-1 text-sm text-zinc-400">{a.desc}</p>
                <p className="mt-3 text-xs text-zinc-600 italic group-hover:text-zinc-500 transition">
                  {a.task}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Differentiators ─── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Not another chatbot.
          </h2>
          <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
            A single AI assistant gives you suggestions. A full AI org gives you results.
          </p>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-zinc-500 px-5">
              <span>Other AI tools</span>
              <span className="text-blue-400">autofound.ai</span>
            </div>
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-3 px-5 py-4 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <span className="text-zinc-500 line-through decoration-zinc-700">
                  {c.them}
                </span>
                <span className="text-white">{c.us}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Simple pricing
          </h2>
          <p className="text-zinc-400 text-center mb-14">
            You bring the API keys. We bring the infrastructure.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`p-6 rounded-2xl border ${
                  p.popular
                    ? "border-blue-500/50 bg-blue-500/5"
                    : "border-white/5 bg-white/[0.02]"
                } flex flex-col`}
              >
                {p.popular && (
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-4">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-zinc-500 text-sm">{p.sub}</span>
                </div>
                <p className="mt-2 text-blue-400 text-sm font-medium">
                  {p.agents}
                </p>
                <ul className="mt-6 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-sm text-zinc-400 flex items-center gap-2">
                      <span className="text-blue-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#waitlist"
                  className={`mt-6 block text-center py-3 rounded-lg font-semibold transition ${
                    p.popular
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  Get started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA / Waitlist ─── */}
      <section id="waitlist" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to build your AI company?
          </h2>
          <p className="text-zinc-400 mb-10">
            Join the waitlist and be the first to hire your AI workforce.
          </p>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-zinc-600">
          <span>
            © {new Date().getFullYear()} autofound.ai — All rights reserved.
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-400 transition">Twitter</a>
            <a href="#" className="hover:text-zinc-400 transition">GitHub</a>
            <a href="#" className="hover:text-zinc-400 transition">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
