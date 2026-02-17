"use client";

import { useState } from "react";
import Link from "next/link";
import LazyAgentModel from "./components/LazyAgentModel";
import TerminalDemo from "./components/TerminalDemo";

/* ───────────────────────── components ───────────────────────── */


function CTAButtons({ className = "", center = false }: { className?: string; center?: boolean }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${center ? "items-center sm:justify-center" : ""} ${className}`}>
      <Link
        href="/sign-up"
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
      >
        Get started free
      </Link>
      <Link
        href="/sign-in"
        className="px-8 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-lg border border-white/10 transition"
      >
        Sign in
      </Link>
    </div>
  );
}

const faqs = [
  { q: "How does Bring Your Own Key (BYOK) work?", a: "You connect your own AI provider API keys. Your usage, your costs, full control." },
  { q: "What AI models are supported?", a: "OpenAI, Anthropic Claude, Google Gemini, Mistral, Llama, and 100+ more via standard APIs." },
  { q: "Can I customize agent roles?", a: "Yes, every agent template is fully customizable. Edit system prompts, tools, permissions, and communication rules." },
  { q: "Is my data private?", a: "Absolutely. With BYOK, data flows directly between you and your AI provider. We never see your prompts or outputs." },
  { q: "Can agents communicate with each other?", a: "Yes, agents can delegate tasks, request approvals, and escalate issues based on your team structure." },
  { q: "What happens if an agent makes a mistake?", a: "All critical actions require human approval gates. You set the rules for what needs sign-off." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition cursor-pointer"
      >
        <span className="font-medium text-white pr-4">{q}</span>
        <span className={`text-zinc-500 text-xl transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-zinc-400 leading-relaxed">{a}</div>
      )}
    </div>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Frequently asked questions</h2>
        <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">Everything you need to know about autofound.ai</p>
        <div className="space-y-3">
          {faqs.map((f) => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
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
    title: "Define your team structure",
    desc: "Set up roles, communication channels, escalation paths, and approval gates for your AI workforce.",
  },
  {
    n: "03",
    title: "Let them work",
    desc: "Agents execute real tasks — write content, research leads, manage expenses, deploy code. Not advice. Actual output.",
  },
];

const agents = [
  { emoji: "👔", role: "CEO Agent", desc: "Reviews reports, sets priorities, delegates across departments.", task: "\"Summarize this week's KPIs and assign Q2 OKRs.\"", image: "/models/agent-ceo.png", model: "/models/ceo.glb" },
  { emoji: "💻", role: "Dev Agent", desc: "Writes code, runs tests, deploys to staging or production.", task: "\"Fix the auth bug in PR #42 and deploy to staging.\"", image: "/models/agent-dev.png", model: "/models/dev.glb" },
  { emoji: "📣", role: "Marketing Agent", desc: "Runs campaigns, tracks analytics, optimizes funnels and content.", task: "\"Launch the Q1 email campaign and report open rates.\"", image: "/models/agent-marketing.png", model: "/models/marketing.glb" },
  { emoji: "🤝", role: "Sales Agent", desc: "Qualifies leads, sends proposals, follows up on deals.", task: "\"Follow up with the 12 warm leads from last week.\"", image: "/models/agent-sales.png", model: "/models/sales.glb" },
  { emoji: "🎧", role: "Customer Support", desc: "Handles tickets, writes help docs, escalates critical issues.", task: "\"Resolve the 15 open support tickets and update the FAQ.\"" },
  { emoji: "📊", role: "Data Analyst", desc: "Crunches numbers, builds reports, spots trends in your data.", task: "\"Generate the weekly KPI dashboard and flag anomalies.\"" },
  { emoji: "🔧", role: "Operations Manager", desc: "Manages workflows, coordinates between teams, optimizes processes.", task: "\"Audit our onboarding flow and reduce steps from 8 to 5.\"" },
  { emoji: "✍️", role: "Content Writer", desc: "Writes blog posts, social copy, newsletters, and landing pages.", task: "\"Write 3 SEO blog posts targeting our top keywords.\"" },
];

const pricing = [
  { name: "Starter", price: "Free", sub: "forever", agents: "3 agents", features: ["Team structure", "Community templates", "BYOK"] },
  { name: "Growth", price: "$29", sub: "/month", agents: "15 agents", features: ["Custom templates", "Advanced comm rules", "Priority support"], popular: true },
  { name: "Business", price: "$79", sub: "/month", agents: "Unlimited agents", features: ["API access", "Team collaboration", "Priority execution"] },
];

const comparisons = [
  { them: "Single chatbot", us: "Full AI team hierarchy" },
  { them: "You orchestrate everything", us: "Agents collaborate autonomously" },
  { them: "Flat, no structure", us: "Hierarchical delegation & escalation" },
  { them: "Locked to one provider", us: "BYOK — bring your own API keys" },
  { them: "\"Here's what you could do…\"", us: "Real execution, real output" },
];

/* ───────────────────────── page ───────────────────────── */

function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="sm:hidden p-2 text-zinc-400 hover:text-white" aria-label="Menu">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} /></svg>
      </button>
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 p-4 flex flex-col gap-4 sm:hidden z-50">
          <a href="#how" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">How it works</a>
          <a href="#agents" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">Agents</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">Pricing</a>
          <a href="#faq" onClick={() => setOpen(false)} className="text-zinc-300 hover:text-white">FAQ</a>
          <div className="flex gap-3 pt-2 border-t border-white/10">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white">Sign in</Link>
            <Link href="/sign-up" className="text-sm px-4 py-2 bg-blue-600 rounded-lg font-medium">Get started</Link>
          </div>
        </div>
      )}
    </>
  );
}

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
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="hidden sm:flex gap-3">
            <Link href="/sign-in" className="text-sm px-4 py-2 text-zinc-400 hover:text-white transition">
              Sign in
            </Link>
            <Link href="/sign-up" className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition">
              Get started
            </Link>
          </div>
          <MobileMenu />
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden min-h-[90vh] flex items-center">
        {/* Background image — behind text, blended into bg */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/images/hero-workplace.jpg"
            alt=""
            className="w-full max-w-5xl opacity-30 object-contain"
            style={{
              maskImage: 'radial-gradient(ellipse 70% 70% at center, black 30%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 30%, transparent 80%)',
            }}
          />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] animate-fade-in-up">
            Your first employees
            <br />
            <span className="text-blue-500">are AI.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
            Build and run your company with AI agent teams. Hire roles, define
            team structures, and let them execute real work — autonomously.
          </p>
          <div className="mt-10 animate-fade-in-up animate-delay-200">
            <CTAButtons center />
          </div>
          <p className="mt-4 text-sm text-zinc-600 animate-fade-in-up animate-delay-300">
            Free to start · No credit card required · BYOK
          </p>
        </div>
      </section>

      {/* ─── Terminal Demo ─── */}
      <TerminalDemo />

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

      {/* ─── Agent templates ─── */}
      <section id="agents" className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url(/images/agents-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Agent templates
          </h2>
          <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
            Pre-built roles with system prompts, tools, and default behaviors.
            Customize or create your own.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto gap-6">
            {agents.map((a) => (
              <div
                key={a.role}
                className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-blue-500/30 hover:bg-white/[0.04] transition group"
              >
                <div className="flex justify-center mb-3">
                  {a.model ? (
                    <LazyAgentModel modelUrl={a.model} />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-6xl">
                      {a.emoji}
                    </div>
                  )}
                </div>
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
                <Link
                  href="/sign-up"
                  className={`mt-6 block text-center py-3 rounded-lg font-semibold transition ${
                    p.popular
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-zinc-300"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <FAQSection />

      {/* ─── CTA ─── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to build your AI company?
          </h2>
          <p className="text-zinc-400 mb-10">
            Sign up free and hire your first AI employees in minutes.
          </p>
          <CTAButtons center />
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
