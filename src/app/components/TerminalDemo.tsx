"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── terminal line types ── */
type Line =
  | { type: "cmd"; text: string }
  | { type: "output"; text: string; color?: string }
  | { type: "status"; icon: string; text: string; color: string }
  | { type: "divider" }
  | { type: "blank" };

/* ── demo scenarios ── */
const scenarios: { title: string; lines: Line[] }[] = [
  {
    title: "Deploy a marketing campaign",
    lines: [
      { type: "cmd", text: "autofound run --org acme-corp --task \"Launch Q1 email campaign\"" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "CEO Agent received task, delegating to CMO...", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "CMO Agent planning campaign strategy...", color: "#10b981" },
      { type: "blank" },
      { type: "output", text: "  📋 Campaign: Q1 Product Launch" },
      { type: "output", text: "  📧 Segments: 3 (Enterprise, SMB, Trial users)" },
      { type: "output", text: "  ✍️  Writer Agent drafting 3 email variants..." },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Writer Agent completed drafts", color: "#f59e0b" },
      { type: "status", icon: "▸", text: "CMO Agent reviewing copy...", color: "#10b981" },
      { type: "output", text: "  ✓ Subject lines A/B tested (predicted 24% open rate)" },
      { type: "output", text: "  ✓ Compliance check passed" },
      { type: "output", text: "  ✓ Scheduled: Mon 9:00 AM EST" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "Campaign ready — awaiting your approval to send", color: "#10b981" },
      { type: "output", text: "  → Review at dashboard.autofound.ai/campaigns/q1-launch", color: "#3b82f6" },
    ],
  },
  {
    title: "Fix a production bug",
    lines: [
      { type: "cmd", text: "autofound run --org acme-corp --task \"Fix auth timeout bug in PR #42\"" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "CEO Agent routing to CTO...", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "CTO Agent assigning to Dev Agent...", color: "#a855f7" },
      { type: "blank" },
      { type: "output", text: "  🔍 Dev Agent analyzing PR #42..." },
      { type: "output", text: "  Found: session.maxAge set to 300ms instead of 300s" },
      { type: "output", text: "  File: src/lib/auth.ts:47" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Dev Agent pushing fix...", color: "#a855f7" },
      { type: "output", text: "  ✓ Fix committed: fix(auth): correct session timeout unit" },
      { type: "status", icon: "▸", text: "QA Agent running test suite...", color: "#f59e0b" },
      { type: "output", text: "  ✓ 142/142 tests passing" },
      { type: "output", text: "  ✓ Auth flow regression: PASS" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "CTO Agent approved — deploying to staging", color: "#a855f7" },
      { type: "status", icon: "✓", text: "Deployed to staging. Promote to prod?", color: "#10b981" },
    ],
  },
  {
    title: "Generate a financial report",
    lines: [
      { type: "cmd", text: "autofound run --org acme-corp --task \"Monthly P&L report for January\"" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "CEO Agent delegating to CFO...", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "CFO Agent pulling financial data...", color: "#f59e0b" },
      { type: "blank" },
      { type: "output", text: "  📊 Data Analyst crunching numbers..." },
      { type: "output", text: "  Sources: Stripe, QuickBooks, Payroll API" },
      { type: "blank" },
      { type: "output", text: "  Revenue:     $142,800  (+12% MoM)" },
      { type: "output", text: "  COGS:         $38,200" },
      { type: "output", text: "  OpEx:         $67,400" },
      { type: "output", text: "  Net Income:   $37,200  (26% margin)" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "CFO Agent flagged 2 anomalies", color: "#f59e0b" },
      { type: "output", text: "  ⚠ AWS spend +34% — Dev Agent notified to investigate" },
      { type: "output", text: "  ⚠ Subscription churn 4.2% — Sales Agent creating win-back flow" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "Report generated — PDF + Notion page ready", color: "#10b981" },
    ],
  },
];

/* ── typing speed config ── */
const CMD_CHAR_MS = 30;
const LINE_DELAY_MS = 80;

export default function TerminalDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visibleLines, setVisibleLines] = useState<Line[]>([]);
  const [typingCmd, setTypingCmd] = useState("");
  const [isTypingCmd, setIsTypingCmd] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scenario = scenarios[activeIdx];

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines, typingCmd]);

  /* play a scenario */
  const play = useCallback((idx: number) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setActiveIdx(idx);
    setVisibleLines([]);
    setTypingCmd("");
    setIsTypingCmd(false);
    setDone(false);

    const lines = scenarios[idx].lines;

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
            /* type out the command char by char */
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
  useEffect(() => { play(0); }, [play]);

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
          Watch AI agents collaborate to complete real business tasks.
        </p>

        {/* scenario tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {scenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => play(i)}
              className={`text-xs sm:text-sm px-4 py-2 rounded-lg border transition cursor-pointer ${
                i === activeIdx
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                  : "bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

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
            {visibleLines.map(renderLine)}
            {/* typing cursor for command */}
            {isTypingCmd && (
              <div className="flex gap-2">
                <span className="text-emerald-400 shrink-0">$</span>
                <span className="text-zinc-200">
                  {typingCmd}
                  <span className="inline-block w-2 h-4 bg-white/70 ml-0.5 animate-pulse align-middle" />
                </span>
              </div>
            )}
            {/* idle cursor */}
            {done && (
              <div className="flex gap-2 mt-1">
                <span className="text-emerald-400 shrink-0">$</span>
                <span className="inline-block w-2 h-4 bg-white/70 animate-pulse align-middle" />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Simulated demo · Real agents execute actual tasks in your workspace
        </p>
      </div>
    </section>
  );
}
