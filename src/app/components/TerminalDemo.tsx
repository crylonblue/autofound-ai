"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ── terminal line types ── */
type Line =
  | { type: "cmd"; text: string }
  | { type: "output"; text: string; color?: string }
  | { type: "status"; icon: string; text: string; color: string }
  | { type: "divider" }
  | { type: "blank" };

/* ── demo scenarios (agent toolbox) ── */
const scenarios: { id: string; title: string; lines: Line[] }[] = [
  {
    id: "research",
    title: "Research & summarize",
    lines: [
      { type: "cmd", text: "agent run research-bot --task \"Summarize competitor pricing for Q1 report\"" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "research-bot activated — skills: web-research, memory", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "web-research: searching for competitor pricing pages...", color: "#10b981" },
      { type: "blank" },
      { type: "output", text: "  🔍 Found 12 competitor pricing pages" },
      { type: "output", text: "  📄 Fetching: acme.com/pricing, rival.io/plans, ..." },
      { type: "status", icon: "▸", text: "web-research: extracting pricing data...", color: "#10b981" },
      { type: "blank" },
      { type: "output", text: "  ✓ Acme Corp — Starter: $0, Pro: $49, Enterprise: Custom" },
      { type: "output", text: "  ✓ Rival.io — Free: $0, Team: $29, Business: $99" },
      { type: "output", text: "  ✓ Nexus AI — Solo: $19, Growth: $59, Scale: $149" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "memory: saving findings to workspace...", color: "#a855f7" },
      { type: "output", text: "  ✓ Report saved: /reports/competitor-pricing-q1.md" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "Task complete — 12 competitors analyzed, report generated", color: "#10b981" },
    ],
  },
  {
    id: "deploy",
    title: "Deploy & execute code",
    lines: [
      { type: "cmd", text: "agent run dev-agent --task \"Run the data pipeline and deploy to staging\"" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "dev-agent activated — skills: pod-compute, file-management", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "pod-compute: spinning up ephemeral container...", color: "#06b6d4" },
      { type: "blank" },
      { type: "output", text: "  🐳 Container ready: fly-pod-8a2f (256MB, us-east)" },
      { type: "output", text: "  📦 Installing dependencies..." },
      { type: "status", icon: "▸", text: "pod-compute: executing pipeline.py...", color: "#06b6d4" },
      { type: "blank" },
      { type: "output", text: "  ✓ ETL: 14,230 rows processed (3.2s)" },
      { type: "output", text: "  ✓ Validation: all schema checks passed" },
      { type: "output", text: "  ✓ Tests: 28/28 passing" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "file-management: saving artifacts...", color: "#f59e0b" },
      { type: "output", text: "  ✓ Output: /data/processed/q1-pipeline.parquet" },
      { type: "status", icon: "▸", text: "pod-compute: deploying to staging...", color: "#06b6d4" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "Deployed to staging. Container terminated.", color: "#10b981" },
    ],
  },
  {
    id: "heartbeat",
    title: "Scheduled heartbeat",
    lines: [
      { type: "cmd", text: "agent heartbeat monitor-bot --interval 30m" },
      { type: "blank" },
      { type: "status", icon: "♥", text: "monitor-bot heartbeat triggered (every 30m)", color: "#ec4899" },
      { type: "status", icon: "▸", text: "skills: web-research, communication, memory", color: "#3b82f6" },
      { type: "blank" },
      { type: "output", text: "  📊 Checking monitored services..." },
      { type: "output", text: "  ✓ API uptime: 99.97% (last 24h)" },
      { type: "output", text: "  ✓ Error rate: 0.02% — within threshold" },
      { type: "output", text: "  ⚠ Response time: p99 = 820ms (threshold: 500ms)" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "communication: alerting ops-agent about latency spike...", color: "#f59e0b" },
      { type: "output", text: "  → Message sent to ops-agent: \"p99 latency spike detected\"" },
      { type: "status", icon: "▸", text: "memory: logging anomaly to history...", color: "#a855f7" },
      { type: "blank" },
      { type: "output", text: "  ✓ Anomaly logged: /memory/incidents/latency-2025-01-15.json" },
      { type: "status", icon: "♥", text: "Heartbeat complete. Next check in 30m.", color: "#ec4899" },
    ],
  },
];

/* ── typing speed config ── */
const CMD_CHAR_MS = 30;
const LINE_DELAY_MS = 80;

export default function TerminalDemo() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const [visibleLines, setVisibleLines] = useState<Line[]>([]);
  const [typingCmd, setTypingCmd] = useState("");
  const [isTypingCmd, setIsTypingCmd] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines, typingCmd]);

  /* play a scenario */
  const play = useCallback((id: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setActiveId(id);
    setVisibleLines([]);
    setTypingCmd("");
    setIsTypingCmd(false);
    setDone(false);

    const scenario = scenarios.find((s) => s.id === id)!;
    const lines = scenario.lines;

    const sleep = (ms: number) =>
      new Promise<void>((res, rej) => {
        const t = setTimeout(res, ms);
        ac.signal.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("aborted")); });
      });

    (async () => {
      try {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (i === 0 && line.type === "cmd") {
            setIsTypingCmd(true);
            for (let c = 1; c <= line.text.length; c++) {
              setTypingCmd(line.text.slice(0, c));
              await sleep(CMD_CHAR_MS);
            }
            setIsTypingCmd(false);
            setVisibleLines((prev) => [...prev, line]);
            setTypingCmd("");
            await sleep(LINE_DELAY_MS * 4);
          } else {
            setVisibleLines((prev) => [...prev, line]);
            await sleep(line.type === "blank" ? LINE_DELAY_MS / 2 : LINE_DELAY_MS);
          }
        }
        setDone(true);
      } catch { /* aborted */ }
    })();
  }, []);

  /* start first scenario on mount */
  useEffect(() => { play(scenarios[0].id); }, [play]);

  const renderLine = (line: Line, i: number) => {
    switch (line.type) {
      case "cmd":
        return (
          <div key={i} className="flex gap-2">
            <span className="text-emerald-400 shrink-0">$</span>
            <span className="text-zinc-200">{line.text}</span>
          </div>
        );
      case "output":
        return (
          <div key={i} style={{ color: line.color || "#a1a1aa" }} className="whitespace-pre">
            {line.text}
          </div>
        );
      case "status":
        return (
          <div key={i} className="flex gap-2" style={{ color: line.color }}>
            <span>{line.icon}</span>
            <span>{line.text}</span>
          </div>
        );
      case "divider":
        return <div key={i} className="border-t border-white/5 my-1" />;
      case "blank":
        return <div key={i} className="h-2" />;
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          See it in action
        </h2>
        <p className="text-zinc-400 text-center mb-8 max-w-xl mx-auto">
          Watch autonomous agents use skills to complete real tasks.
        </p>

        <Tabs value={activeId} onValueChange={(v) => play(v)} className="w-full">
          <TabsList className="w-full justify-center bg-transparent gap-2 mb-6 flex-wrap">
            {scenarios.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="text-xs sm:text-sm px-4 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:border-white/10 data-[state=active]:bg-blue-600/20 data-[state=active]:border-blue-500/40 data-[state=active]:text-blue-400"
              >
                {s.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {scenarios.map((s) => (
            <TabsContent key={s.id} value={s.id}>
              {/* terminal window */}
              <div className="rounded-xl border border-white/10 bg-[#0c0c0c] overflow-hidden shadow-2xl shadow-black/50">
                {/* title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-3 text-xs text-zinc-600 font-mono">autofound — terminal</span>
                </div>

                {/* terminal body */}
                <div
                  ref={scrollRef}
                  className="p-5 font-mono text-sm leading-relaxed h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
                >
                  {activeId === s.id && (
                    <>
                      {visibleLines.map(renderLine)}
                      {isTypingCmd && (
                        <div className="flex gap-2">
                          <span className="text-emerald-400 shrink-0">$</span>
                          <span className="text-zinc-200">
                            {typingCmd}
                            <span className="inline-block w-2 h-4 bg-white/70 ml-0.5 animate-pulse align-middle" />
                          </span>
                        </div>
                      )}
                      {done && (
                        <div className="flex gap-2 mt-1">
                          <span className="text-emerald-400 shrink-0">$</span>
                          <span className="inline-block w-2 h-4 bg-white/70 animate-pulse align-middle" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Simulated demo &middot; Real agents execute tasks in isolated containers
        </p>
      </div>
    </section>
  );
}
