"use client";

import { useEffect, useRef, useState } from "react";

export default function AgentBuilderPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1300),
      setTimeout(() => setStep(4), 1800),
      setTimeout(() => setStep(5), 2300),
      setTimeout(() => setStep(6), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Build your agent in seconds
        </h2>
        <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
          A simple, powerful interface to configure and deploy autonomous agents.
        </p>

        <div ref={ref} className="rounded-xl border border-white/10 bg-[#0c0c0c] overflow-hidden shadow-2xl shadow-black/50">
          {/* Fake browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="ml-3 flex-1 bg-white/[0.04] rounded-md px-3 py-1 text-xs text-zinc-600 font-mono">
              app.autofound.ai/agents/new
            </div>
          </div>

          {/* Form body */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Agent name */}
            <div className={`transition-all duration-500 ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Agent Name</label>
              <div className="px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] text-white text-sm font-mono">
                {step >= 1 && "research-agent"}
                {step === 1 && <span className="inline-block w-2 h-4 bg-white/70 ml-0.5 animate-type-cursor align-middle" />}
              </div>
            </div>

            {/* Model picker */}
            <div className={`transition-all duration-500 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Model</label>
              <div className="px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] text-sm flex items-center justify-between">
                <span className="text-white">claude-sonnet-4</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-500">
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* System prompt */}
            <div className={`transition-all duration-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">System Prompt</label>
              <div className="px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] text-sm text-zinc-300 min-h-[60px] font-mono leading-relaxed">
                {step >= 3 && "You are a research agent. Search the web, analyze findings, and produce concise reports with citations."}
              </div>
            </div>

            {/* Skills */}
            <div className={`transition-all duration-500 ${step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Skills</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Web Research", checked: true },
                  { name: "Memory", checked: true },
                  { name: "File Management", checked: true },
                  { name: "Pod Compute", checked: false },
                  { name: "Communication", checked: false },
                ].map((s) => (
                  <label key={s.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.02] text-xs cursor-pointer">
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${s.checked ? "bg-blue-600 border-blue-600" : "border-white/20"}`}>
                      {s.checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    <span className={s.checked ? "text-white" : "text-zinc-500"}>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Heartbeat config */}
            <div className={`transition-all duration-500 ${step >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Heartbeat</label>
              <div className="flex items-center gap-3">
                <div className="px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] text-sm text-white">
                  Every 30 minutes
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-heartbeat-pulse" />
                  Active
                </span>
              </div>
            </div>

            {/* Deploy button */}
            <div className={`transition-all duration-500 pt-2 ${step >= 6 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-sm">
                Deploy Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
