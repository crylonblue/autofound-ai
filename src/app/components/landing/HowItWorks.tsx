"use client";

import { useScrollReveal } from "./useScrollReveal";

function StepChat() {
  return (
    <div className="glass-card rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
          <span className="text-xs text-blue-400">You</span>
        </div>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      <div className="bg-white/[0.03] rounded-lg px-3 py-2 text-sm text-zinc-300">
        Research the top 10 competitors in our space and create a comparison report
      </div>
      <div className="mt-2 flex gap-2">
        <div className="h-8 px-3 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center text-xs text-blue-400">
          Send
        </div>
      </div>
    </div>
  );
}

function StepProgress() {
  const tasks = [
    { label: "Searching competitor websites", done: true },
    { label: "Analyzing pricing pages", done: true },
    { label: "Comparing feature sets", done: true },
    { label: "Generating report", done: false },
  ];
  return (
    <div className="glass-card rounded-xl p-4 mt-4">
      <div className="space-y-2.5">
        {tasks.map((t) => (
          <div key={t.label} className="flex items-center gap-2.5">
            {t.done ? (
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-blue-500/40 border-t-blue-400 animate-spin" />
            )}
            <span className={`text-xs ${t.done ? "text-zinc-400" : "text-white"}`}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDashboard() {
  return (
    <div className="glass-card rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-300">Competitor Report</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Complete</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Competitors analyzed</span>
          <span className="text-white font-medium">10</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Key insights found</span>
          <span className="text-white font-medium">23</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Time saved</span>
          <span className="text-emerald-400 font-medium">4.5 hours</span>
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    n: "01",
    title: "Tell your agent what to do",
    desc: "Just describe the task in plain English. No coding, no configuration files, no technical setup.",
    visual: <StepChat />,
  },
  {
    n: "02",
    title: "Your agent gets to work",
    desc: "Your AI agent breaks down the task, executes each step, and keeps you updated on progress.",
    visual: <StepProgress />,
  },
  {
    n: "03",
    title: "Review results, not code",
    desc: "Get polished deliverables and clear metrics. Download reports, approve actions, or request changes.",
    visual: <StepDashboard />,
  },
];

export default function HowItWorks() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="how" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Up and running in <span className="text-gradient">3 simple steps</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            No coding. No config files. No technical skills needed.
          </p>
        </div>

        <div
          ref={ref}
          className={`grid md:grid-cols-3 gap-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {steps.map((s) => (
            <div
              key={s.n}
              className="glass-card rounded-xl p-6 hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-blue-500 font-mono text-sm font-bold">{s.n}</span>
              <h3 className="mt-2 text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-3 text-zinc-400 leading-relaxed text-sm">{s.desc}</p>
              {s.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
