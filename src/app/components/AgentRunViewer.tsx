"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Loader2,
  Square,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
} from "lucide-react";
import { RUN_STATUS } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Pricing per 1K tokens (Claude)
const INPUT_COST_PER_1K = 0.003;
const OUTPUT_COST_PER_1K = 0.015;

function ToolCallCard({ tool, args, result, timestamp }: {
  tool: string;
  args?: string;
  result?: string;
  timestamp: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
        <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-xs font-mono text-zinc-300 truncate">{tool}</span>
        <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5">
          {args && (
            <div>
              <p className="text-[10px] text-zinc-500 mt-2 mb-1">Input</p>
              <pre className="text-xs text-zinc-400 font-mono bg-white/[0.02] rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                {tryFormat(args)}
              </pre>
            </div>
          )}
          {result && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">Output</p>
              <pre className="text-xs text-zinc-400 font-mono bg-white/[0.02] rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                {tryFormat(result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function tryFormat(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function StreamingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const prevLen = useRef(0);

  useEffect(() => {
    if (text.length <= prevLen.current) {
      setDisplayed(text);
      prevLen.current = text.length;
      return;
    }

    const alreadyShown = text.slice(0, prevLen.current);
    const newContent = text.slice(prevLen.current);
    let i = 0;

    const interval = setInterval(() => {
      i += 3;
      if (i >= newContent.length) {
        setDisplayed(text);
        prevLen.current = text.length;
        clearInterval(interval);
      } else {
        setDisplayed(alreadyShown + newContent.slice(0, i));
      }
    }, 16);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm" />
      )}
    </pre>
  );
}

export default function AgentRunViewer({ runId }: { runId: Id<"agentRuns"> }) {
  const run = useQuery(api.agentRuns.getRunById, { runId });
  const cancelRun = useAction(api.flyOrchestrator.cancelRun);
  const [cancelling, setCancelling] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [run?.progressText, run?.toolCalls?.length]);

  if (!run) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  const style = RUN_STATUS[run.status as keyof typeof RUN_STATUS] || RUN_STATUS.queued;
  const StatusIcon = style.icon;
  const isActive = run.status === "queued" || run.status === "starting" || run.status === "running";

  const inputCost = ((run.inputTokens || 0) / 1000) * INPUT_COST_PER_1K;
  const outputCost = ((run.outputTokens || 0) / 1000) * OUTPUT_COST_PER_1K;
  const totalCost = inputCost + outputCost;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelRun({ runId, machineId: run.machineId });
    } finally {
      setCancelling(false);
    }
  };

  const elapsed = run.startedAt
    ? ((run.completedAt || Date.now()) - run.startedAt) / 1000
    : 0;

  return (
    <Card className="overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className={`${style.bg} ${style.color}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${style.pulse ? "animate-spin" : ""}`} />
            {style.label}
          </Badge>
          {elapsed > 0 && (
            <span className="text-[11px] text-zinc-500">
              {elapsed < 60 ? `${Math.round(elapsed)}s` : `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(run.inputTokens || run.outputTokens) ? (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>{(run.inputTokens || 0).toLocaleString()} in</span>
              <span className="text-zinc-700">·</span>
              <span>{(run.outputTokens || 0).toLocaleString()} out</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">${totalCost.toFixed(4)}</span>
            </div>
          ) : null}
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400"
            >
              {cancelling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="max-h-96">
        <div className="p-4 space-y-3">
          {run.progressText && (
            <div>
              <StreamingText text={run.progressText} />
            </div>
          )}

          {run.toolCalls && run.toolCalls.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                Tool Calls ({run.toolCalls.length})
              </p>
              {run.toolCalls.map((tc: { tool: string; args?: string; result?: string; timestamp: number }, i: number) => (
                <ToolCallCard
                  key={i}
                  tool={tc.tool}
                  args={tc.args}
                  result={tc.result}
                  timestamp={tc.timestamp}
                />
              ))}
            </div>
          )}

          {run.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-400 font-mono">{run.error}</p>
            </div>
          )}

          {run.status === "completed" && run.output && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-[10px] text-emerald-500/60 uppercase tracking-wider font-medium mb-1.5">Result</p>
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{run.output}</pre>
            </div>
          )}

          {isActive && !run.progressText && !run.toolCalls?.length && (
            <div className="flex items-center gap-2 py-4 justify-center text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for agent output…
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </Card>
  );
}
