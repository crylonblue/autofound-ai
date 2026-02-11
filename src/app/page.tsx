"use client";

import { useState } from "react";

const competitors = [
  { name: "Stripe Atlas", price: "$500", speed: "1-2 days", scope: "Delaware only", humans: "Yes" },
  { name: "Firstbase", price: "$399+", speed: "2-8 weeks", scope: "US only", humans: "Yes" },
  { name: "doola", price: "$297+", speed: "Days", scope: "US only", humans: "Yes" },
  { name: "ZenBusiness", price: "$0 + fees", speed: "Days-weeks", scope: "US only", humans: "Yes" },
  { name: "autofound.ai", price: "From $199", speed: "Minutes", scope: "US, EU, UK", humans: "No ✨" },
];

const steps = [
  {
    num: "01",
    title: "Tell us about your business",
    desc: "Answer a few simple questions. Our AI determines the optimal entity type, jurisdiction, and structure for your goals.",
  },
  {
    num: "02",
    title: "AI handles everything",
    desc: "Formation documents, government filings, EIN/tax ID, registered agent — all processed autonomously. No waiting on humans.",
  },
  {
    num: "03",
    title: "You're in business",
    desc: "Receive your incorporation docs, bank account access, and compliance dashboard. Start operating immediately.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$199",
    period: "one-time",
    features: ["LLC or Corp formation", "EIN / Tax ID", "Registered agent (1 year)", "Operating agreement", "Formation docs"],
    cta: "Join Waitlist",
    highlight: false,
  },
  {
    name: "Autopilot",
    price: "$29",
    period: "/month",
    features: ["Everything in Starter", "Compliance monitoring", "Annual report filing", "Deadline management", "Document storage"],
    cta: "Join Waitlist",
    highlight: true,
  },
  {
    name: "Full Stack",
    price: "$99",
    period: "/month",
    features: ["Everything in Autopilot", "Banking setup", "Bookkeeping", "Tax filing", "Dedicated AI agent"],
    cta: "Join Waitlist",
    highlight: false,
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold">
            auto<span className="text-indigo-400">found</span>.ai
          </span>
          <div className="hidden sm:flex gap-8 text-sm text-zinc-400">
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#compare" className="hover:text-white transition">Compare</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>
          <a href="#waitlist" className="text-sm bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg transition font-medium">
            Get Early Access
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm">
            🤖 Fully autonomous — zero humans in the loop
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Company formation
            <br />
            <span className="text-indigo-400">on autopilot</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Incorporate in the US, EU, or UK in minutes. AI handles the paperwork,
            filings, compliance, and everything in between. No agents. No delays. No BS.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" id="waitlist">
            {submitted ? (
              <div className="w-full text-center py-3 px-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                ✓ You&apos;re on the list! We&apos;ll be in touch.
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="founder@startup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-indigo-500 focus:outline-none text-white placeholder:text-zinc-500"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition whitespace-nowrap"
                >
                  Join Waitlist →
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
            Three steps. A few minutes. Your company is real.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="relative p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <span className="text-5xl font-bold text-indigo-500/20 absolute top-4 right-6">
                  {step.num}
                </span>
                <h3 className="text-lg font-semibold mb-3 mt-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Why autofound.ai?</h2>
          <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
            See how we stack up against traditional formation services.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Service</th>
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Price</th>
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Speed</th>
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Jurisdictions</th>
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Humans?</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c) => (
                  <tr
                    key={c.name}
                    className={`border-b border-zinc-800/50 ${
                      c.name === "autofound.ai"
                        ? "bg-indigo-500/5 font-medium"
                        : ""
                    }`}
                  >
                    <td className="py-4 px-4">{c.name}</td>
                    <td className="py-4 px-4">{c.price}</td>
                    <td className="py-4 px-4">{c.speed}</td>
                    <td className="py-4 px-4">{c.scope}</td>
                    <td className="py-4 px-4">{c.humans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Simple pricing</h2>
          <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
            No hidden fees. No surprise upsells. Ever.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border ${
                  plan.highlight
                    ? "border-indigo-500 bg-indigo-500/5"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {plan.highlight && (
                  <span className="text-xs bg-indigo-500 px-2 py-1 rounded-full font-medium mb-4 inline-block">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-zinc-400 text-sm"> {plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#waitlist"
                  className={`block text-center py-2.5 rounded-lg font-medium transition text-sm ${
                    plan.highlight
                      ? "bg-indigo-500 hover:bg-indigo-600"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-lg font-bold">
            auto<span className="text-indigo-400">found</span>.ai
          </span>
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} autofound.ai — Company formation on autopilot.
          </p>
        </div>
      </footer>
    </div>
  );
}
