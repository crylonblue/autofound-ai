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
    title: "Find SaaS leads by ICP",
    lines: [
      { type: "cmd", text: "autofound search --icp \"Series A B2B SaaS, 20-100 employees, DACH region\"" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Lead Researcher scanning company databases...", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "Market Analyst checking funding data...", color: "#10b981" },
      { type: "blank" },
      { type: "output", text: "  🔍 Found 847 companies matching criteria" },
      { type: "output", text: "  📊 Filtering by hiring signals & tech stack..." },
      { type: "output", text: "  ✓ 134 high-intent prospects identified" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Enriching contacts — email + phone...", color: "#f59e0b" },
      { type: "output", text: "  ✓ 128/134 emails verified (95.5%)" },
      { type: "output", text: "  ✓ 89/134 direct phone numbers found" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Outreach Writer drafting personalized sequences...", color: "#a855f7" },
      { type: "output", text: "  ✓ 134 personalized 3-touch email sequences ready" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "Campaign ready — 134 qualified leads delivered", color: "#10b981" },
      { type: "output", text: "  → Review at app.autofound.ai/campaigns/dach-saas", color: "#3b82f6" },
    ],
  },
  {
    title: "Monitor competitor churn",
    lines: [
      { type: "cmd", text: "autofound scout --competitor \"Competitor X\" --signal churn" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Competitor Scout monitoring review sites & social...", color: "#3b82f6" },
      { type: "status", icon: "▸", text: "Scanning G2, Capterra, Reddit, LinkedIn...", color: "#10b981" },
      { type: "blank" },
      { type: "output", text: "  🎯 23 companies showing switching signals" },
      { type: "output", text: "  📉 Competitor X NPS dropped 12pts this quarter" },
      { type: "output", text: "  💬 8 negative reviews in last 30 days" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Lead Researcher identifying decision-makers...", color: "#f59e0b" },
      { type: "output", text: "  ✓ 23 VP/Director-level contacts enriched" },
      { type: "output", text: "  ✓ Pain points mapped per account" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Outreach Writer crafting displacement sequences...", color: "#a855f7" },
      { type: "output", text: "  ✓ Personalized switch-pitch for each account" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "23 high-intent leads ready for outreach", color: "#10b981" },
    ],
  },
  {
    title: "Track funding signals",
    lines: [
      { type: "cmd", text: "autofound watch --trigger \"Series B funding\" --industry fintech --region US" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Market Analyst monitoring funding databases...", color: "#3b82f6" },
      { type: "output", text: "  📡 Watching Crunchbase, PitchBook, SEC filings..." },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Alert: 3 new rounds detected this week", color: "#f59e0b" },
      { type: "blank" },
      { type: "output", text: "  🏦 PayFlow  — $28M Series B (a16z)" },
      { type: "output", text: "  🏦 LendKit  — $15M Series B (Sequoia)" },
      { type: "output", text: "  🏦 VaultPay — $42M Series B (Tiger Global)" },
      { type: "blank" },
      { type: "status", icon: "▸", text: "Lead Researcher pulling org charts...", color: "#10b981" },
      { type: "output", text: "  ✓ 12 decision-makers identified across 3 companies" },
      { type: "output", text: "  ✓ Budget likelihood: HIGH (post-funding expansion)" },
      { type: "blank" },
      { type: "status", icon: "✓", text: "12 warm leads added to your pipeline", color: "#10b981" },
      { type: "output", text: "  → Auto-synced to HubSpot", color: "#3b82f6" },
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
          Watch AI agents find, qualify, and enrich leads in real time.
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
            <span className="ml-3 text-xs text-zinc-600 font-mono">autofound — lead search</span>
          </div>

          {/* terminal body */}
          <div
            ref={scrollRef}
            className="p-5 font-mono text-sm leading-relaxed h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
          >
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
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          Simulated demo · Real agents deliver actual qualified leads
        </p>
      </div>
    </section>
  );
}
