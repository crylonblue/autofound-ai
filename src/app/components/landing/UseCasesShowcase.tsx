"use client";

import { useScrollReveal } from "./useScrollReveal";

const useCases = [
  {
    title: "Content & Marketing",
    result: "Published 47 blog posts, grew organic traffic 34%",
    description: "AI agents write, edit, and schedule content across all your channels.",
    color: "border-l-blue-500",
    icon: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  },
  {
    title: "Sales & Outreach",
    result: "Researched 200 leads, booked 12 meetings this week",
    description: "Prospect research, personalized outreach, and follow-up on autopilot.",
    color: "border-l-emerald-500",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
  {
    title: "Research & Analysis",
    result: "Analyzed 50 competitors weekly, surfaced 8 opportunities",
    description: "Competitive intelligence, market research, and trend analysis — done for you.",
    color: "border-l-violet-500",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    title: "Customer Support",
    result: "Resolved 340 tickets with 96% satisfaction score",
    description: "Handle support inquiries, escalate complex issues, keep customers happy.",
    color: "border-l-amber-500",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    title: "Operations & Admin",
    result: "Processed 1,847 invoices, zero manual data entry",
    description: "Invoice processing, data entry, scheduling — the boring stuff, automated.",
    color: "border-l-cyan-500",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  {
    title: "Data & Reporting",
    result: "Generated 15 weekly dashboards, saved 20hrs/week",
    description: "Automated reporting, data aggregation, and insights delivered to your inbox.",
    color: "border-l-pink-500",
    icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
];

export default function UseCasesShowcase() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="use-cases" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            One platform. <span className="text-gradient">Endless possibilities.</span>
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Your AI agents handle the work across every department — delivering real, measurable results.
          </p>
        </div>

        <div
          ref={ref}
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {useCases.map((uc, i) => (
            <div
              key={uc.title}
              className={`glass-card rounded-xl p-6 border-l-4 ${uc.color} hover:bg-white/[0.04] transition-colors`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={uc.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">{uc.title}</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">{uc.description}</p>
              <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="text-xs text-zinc-300 font-medium">{uc.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
