"use client";

import Link from "next/link";
import { X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentDetailPanelProps {
  agent: {
    _id: string;
    name: string;
    role: string;
    status: string;
    icon: string;
    color: string;
    systemPrompt: string;
  };
  onClose: () => void;
}

export default function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
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
      {/* Header */}
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

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Role */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            Role
          </div>
          <div className="text-sm text-zinc-300">{agent.role}</div>
        </div>

        {/* Status */}
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

        {/* System prompt excerpt */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            System Prompt
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-6">
            {agent.systemPrompt || "No system prompt configured."}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Link href={`/agents/${agent._id}/chat`}>
          <Button className="w-full" variant="outline" size="sm">
            <MessageSquare className="w-3.5 h-3.5 mr-2" />
            Chat with {agent.name}
          </Button>
        </Link>
      </div>
    </div>
  );
}
