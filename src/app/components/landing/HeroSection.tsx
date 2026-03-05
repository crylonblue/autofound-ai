"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const skills = [
  { name: "Web Research", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { name: "Memory", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { name: "Pod Compute", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { name: "File Management", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
];

function AgentBlueprint() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 400),   // agent name types in
      setTimeout(() => setStep(2), 1000),  // model badge slides in
      setTimeout(() => setStep(3), 1500),  // skill 1
      setTimeout(() => setStep(4), 1800),  // skill 2
      setTimeout(() => setStep(5), 2100),  // skill 3
      setTimeout(() => setStep(6), 2400),  // skill 4
      setTimeout(() => setStep(7), 3000),  // heartbeat starts
      setTimeout(() => setStep(8), 3600),  // terminal line
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-xl border border-white/10 bg-[#0c0c0c] overflow-hidden shadow-2xl shadow-black/50 glow">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs text-zinc-600 font-mono">agent-blueprint.yaml</span>
        </div>

        {/* Blueprint body */}
        <div className="p-5 font-mono text-sm space-y-3">
          {/* Agent name */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">name:</span>
            {step >= 1 ? (
              <span className="text-white animate-fade-in-up">research-agent</span>
            ) : (
              <span className="inline-block w-2 h-4 bg-white/70 animate-type-cursor" />
            )}
          </div>

          {/* Model badge */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">model:</span>
            {step >= 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs animate-slide-in-right">
                claude-sonnet-4
              </span>
            )}
          </div>

          {/* Skills */}
          <div>
            <span className="text-zinc-500">skills:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5 ml-2">
              {skills.map((skill, i) =>
                step >= 3 + i ? (
                  <span
                    key={skill.name}
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-xs animate-slide-in-right ${skill.color}`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {skill.name}
                  </span>
                ) : null
              )}
            </div>
          </div>

          {/* Heartbeat */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">heartbeat:</span>
            {step >= 7 && (
              <span className="flex items-center gap-1.5 animate-fade-in-up">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-heartbeat-pulse" />
                <span className="text-emerald-400 text-xs">every 30m</span>
              </span>
            )}
          </div>

          {/* Terminal status */}
          {step >= 8 && (
            <div className="mt-2 pt-3 border-t border-white/5 animate-fade-in-up">
              <span className="text-emerald-400">$</span>{" "}
              <span className="text-zinc-300">Agent deployed. Heartbeat active.</span>
              <span className="inline-block w-2 h-4 bg-white/70 ml-0.5 animate-type-cursor align-middle" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] animate-fade-in-up">
              Build agents that
              <br />
              <span className="text-blue-500">actually do things.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto lg:mx-0 animate-fade-in-up animate-delay-100">
              Create autonomous AI agents with custom skills, your own API keys,
              and isolated execution.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animate-delay-200">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get started free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#how">Read the docs</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-zinc-600 animate-fade-in-up animate-delay-300">
              Free tier &middot; BYOK &middot; No vendor lock-in &middot; Isolated execution
            </p>
          </div>

          {/* Right — Agent Blueprint */}
          <div className="animate-fade-in-up animate-delay-200">
            <AgentBlueprint />
          </div>
        </div>
      </div>
    </section>
  );
}
