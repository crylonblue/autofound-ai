"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfficeCanvas = dynamic(
  () => import("../(app)/office/_components/OfficeCanvas"),
  { ssr: false }
);

/* ── Demo agents (no DB) ──────────────────────────────── */

interface DemoAgent {
  _id: string;
  name: string;
  role: string;
  status: string;
  icon: string;
  color: string;
  systemPrompt: string;
}

const DEMO_AGENTS: DemoAgent[] = [
  {
    _id: "demo-ceo",
    name: "Alex Chen",
    role: "CEO",
    status: "active",
    icon: "👔",
    color: "#3b82f6",
    systemPrompt:
      "You are Alex Chen, the CEO of a fast-growing startup. You set company vision, make strategic decisions, and coordinate across all departments.",
  },
  {
    _id: "demo-marketing",
    name: "Priya Sharma",
    role: "Marketing Lead",
    status: "active",
    icon: "📣",
    color: "#a855f7",
    systemPrompt:
      "You are Priya Sharma, the Marketing Lead. You craft campaigns, manage brand voice, and drive customer acquisition through content and social channels.",
  },
  {
    _id: "demo-sales",
    name: "Marcus Johnson",
    role: "Sales Rep",
    status: "active",
    icon: "🤝",
    color: "#22c55e",
    systemPrompt:
      "You are Marcus Johnson, a Sales Rep. You qualify leads, run demos, negotiate deals, and maintain strong customer relationships.",
  },
  {
    _id: "demo-dev",
    name: "Yuki Tanaka",
    role: "Dev Engineer",
    status: "active",
    icon: "💻",
    color: "#f59e0b",
    systemPrompt:
      "You are Yuki Tanaka, a Dev Engineer. You build features, review code, fix bugs, and keep the product infrastructure running smoothly.",
  },
];

const DEMO_POSITIONS: Record<string, { x: number; z: number }> = {
  "demo-ceo": { x: -5, z: -5 },
  "demo-marketing": { x: 5, z: -5 },
  "demo-sales": { x: 5, z: 5 },
  "demo-dev": { x: -5, z: 5 },
};

/* ── Demo detail panel (chat → sign-up) ──────────────── */

function DemoDetailPanel({
  agent,
  onClose,
}: {
  agent: DemoAgent;
  onClose: () => void;
}) {
  const statusLabel =
    agent.status === "active"
      ? "Active"
      : agent.status === "paused"
        ? "Paused"
        : "Draft";
  const statusColor =
    agent.status === "active"
      ? "bg-green-500/20 text-green-400"
      : agent.status === "paused"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-zinc-500/20 text-zinc-400";

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0d0d14]/95 backdrop-blur-md border-l border-white/10 flex flex-col z-20 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.icon}</span>
          <span className="font-semibold text-sm text-white">{agent.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            Role
          </div>
          <div className="text-sm text-zinc-300">{agent.role}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            Status
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            System Prompt
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-6">
            {agent.systemPrompt}
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <Link href="/sign-up">
          <Button className="w-full" variant="outline" size="sm">
            <MessageSquare className="w-3.5 h-3.5 mr-2" />
            Chat with {agent.name}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────── */

export default function DemoOfficePage() {
  const [positions, setPositions] = useState(DEMO_POSITIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () => DEMO_AGENTS.find((a) => a._id === selectedId) ?? null,
    [selectedId]
  );

  const handlePositionChange = (agentId: string, x: number, z: number) => {
    setPositions((prev) => ({ ...prev, [agentId]: { x, z } }));
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <OfficeCanvas
          agents={DEMO_AGENTS}
          positions={positions}
          activity={{}}
          selectedId={selectedId}
          onSelectAgent={setSelectedId}
          onPositionChange={handlePositionChange}
        />
      </div>

      {/* Top overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white transition pointer-events-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <span className="text-xs text-zinc-500 hidden sm:block">
          Demo &mdash;{" "}
          <Link
            href="/sign-up"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 pointer-events-auto"
          >
            sign up
          </Link>{" "}
          to hire your own agents
        </span>
      </div>

      {/* Detail panel */}
      {selectedAgent && (
        <DemoDetailPanel
          agent={selectedAgent}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
