"use client";

import { useState } from "react";
import Link from "next/link";
import TerminalDemo from "./components/TerminalDemo";

/* ───────────────────────── components ───────────────────────── */

function CTAButtons({ className = "", center = false }: { className?: string; center?: boolean }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${center ? "items-center sm:justify-center" : ""} ${className}`}>
      <Link
        href="/sign-up"
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
      >
        Start Finding Leads
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
  { q: "How do the AI agents find leads?", a: "Our agents scour public data sources — LinkedIn, company databases, news, job boards, funding announcements, and more — to find prospects matching your ideal customer profile." },
  { q: "How accurate are the leads?", a: "Every lead is verified and enriched with contact info, company data, and relevance scoring. Typical accuracy is 90%+ for email and 85%+ for direct phone." },
  { q: "Can I integrate with my CRM?", a: "Yes — Pro and Scale plans support direct integrations with Salesforce, HubSpot, Pipedrive, and any CRM with an API." },
  { q: "What makes this different from a lead database?", a: "Databases give you static lists. Our AI agents actively research, qualify, and score leads based on your specific ICP — and they get smarter over time." },
  { q: "Is my data private?", a: "Absolutely. Your ICP criteria and lead lists are encrypted and never shared. We never sell your data." },
  { q: "Can I customize the outreach messaging?", a: "Yes — the Outreach Writer agent generates personalized emails and sequences based on each prospect's context. You approve before anything sends." },
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
    title: "Describe your ideal customer",
    desc: "Tell us your ICP — industry, company size, role, tech stack, funding stage. The more specific, the better your leads.",
  },
  {
    n: "02",
    title: "AI agents search & qualify",
    desc: "Our agents scour LinkedIn, company databases, news, and funding data to find and score prospects that match your criteria.",
  },
  {
    n: "03",
    title: "Qualified leads delivered",
    desc: "Receive enriched leads with verified emails, company context, and personalized outreach drafts — ready for your sales team.",
  },
];

const agents = [
  { emoji: "🔍", role: "Lead Researcher", desc: "Finds companies and decision-makers matching your ICP across multiple data sources.", task: "\"Find 50 Series A fintech CTOs in DACH region.\"" },
  { emoji: "📊", role: "Market Analyst", desc: "Tracks market trends, funding rounds, and hiring signals to spot high-intent buyers.", task: "\"Which AI startups raised Series B in the last 90 days?\"" },
  { emoji: "🎯", role: "Competitor Scout", desc: "Monitors competitor customers, pricing changes, and market moves for opportunities.", task: "\"Find companies switching away from Competitor X.\"" },
  { emoji: "✍️", role: "Outreach Writer", desc: "Crafts personalized cold emails and sequences based on each prospect's context.", task: "\"Write a 3-touch sequence for enterprise DevOps leads.\"" },
];

const pricing = [
  { name: "Free", price: "$0", sub: "forever", highlight: "1 campaign", features: ["20 leads per week", "Basic enrichment", "Email export"], popular: false },
  { name: "Pro", price: "$49", sub: "/month", highlight: "5 campaigns", features: ["200 leads per week", "Full enrichment (email + phone)", "Outreach drafts", "Priority support"], popular: true },
  { name: "Scale", price: "$149", sub: "/month", highlight: "Unlimited campaigns", features: ["Unlimited leads", "CRM integrations", "API access", "Custom ICP models", "Dedicated support"], popular: false },
];

const comparisons = [
  { them: "Static lead databases", us: "AI agents that actively research & qualify" },
  { them: "Generic contact lists", us: "ICP-matched, scored & enriched leads" },
  { them: "You write every cold email", us: "Personalized outreach drafted for you" },
  { them: "Manual research hours", us: "Leads delivered while you sleep" },
  { them: "One-size-fits-all filters", us: "Intent signals, funding data & hiring trends" },
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
            <Link href="/sign-up" className="text-sm px-4 py-2 bg-blue-600 rounded-lg font-medium">Start Finding Leads</Link>
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
              Start Finding Leads
            </Link>
          </div>
          <MobileMenu />
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden min-h-[90vh] flex items-center">
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
            AI agents that find
            <br />
            <span className="text-blue-500">your next customers.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
            Describe your ideal customer. Our AI agents research, qualify, and
            deliver enriched leads — so your team can focus on closing.
          </p>
          <div className="mt-10 animate-fade-in-up animate-delay-200">
            <CTAButtons center />
          </div>
          <p className="mt-4 text-sm text-zinc-600 animate-fade-in-up animate-delay-300">
            Free to start · No credit card required · Leads in minutes
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

      {/* ─── Agent roles ─── */}
      <section id="agents" className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Your AI GTM team
          </h2>
          <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
            Specialized agents that work together to fill your pipeline with qualified prospects.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto gap-6">
            {agents.map((a) => (
              <div
                key={a.role}
                className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-blue-500/30 hover:bg-white/[0.04] transition group"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-20 h-20 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-4xl">
                    {a.emoji}
                  </div>
                </div>
                <h3 className="font-semibold text-white text-center">{a.role}</h3>
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
            Not another lead database.
          </h2>
          <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
            Static lists go stale. AI agents actively research, qualify, and deliver.
          </p>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-zinc-500 px-5">
              <span>Traditional tools</span>
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
            Start free. Scale when you&apos;re ready.
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
                  {p.highlight}
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
                  Start Finding Leads
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
            Ready to find your next customers?
          </h2>
          <p className="text-zinc-400 mb-10">
            Sign up free and get your first qualified leads in minutes.
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
