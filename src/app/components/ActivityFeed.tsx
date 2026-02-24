"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  Heart,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Zap,
  AlertTriangle,
  Filter,
  Loader2,
} from "lucide-react";

const typeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  heartbeat_complete: { label: "Heartbeat", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10" },
  task_complete: { label: "Task Done", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  task_failed: { label: "Task Failed", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  chat_response: { label: "Chat", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  proactive_action: { label: "Proactive", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  error: { label: "Error", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ActivityFeedProps {
  /** Show compact version (for dashboard sidebar) */
  compact?: boolean;
  /** Max items to show */
  limit?: number;
}

export default function ActivityFeed({ compact = false, limit = 20 }: ActivityFeedProps) {
  const { user: clerkUser } = useUser();
  const clerkId = clerkUser?.id ?? "";
  const [filterAgent, setFilterAgent] = useState<string | null>(null);

  const activities = useQuery(
    api.activities.listByClerk,
    clerkId
      ? {
          clerkId,
          limit,
          ...(filterAgent ? { agentId: filterAgent as Id<"agents"> } : {}),
        }
      : "skip"
  );

  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");

  if (!activities) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        <Zap className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
        <p>No activity yet.</p>
        <p className="text-xs mt-1">Activity will appear here as your agents work.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Agent filter */}
      {!compact && agents && agents.length > 1 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <Filter className="w-3 h-3 text-zinc-500" />
          <button
            onClick={() => setFilterAgent(null)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              !filterAgent ? "bg-blue-500/10 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All
          </button>
          {agents.map((agent) => (
            <button
              key={agent._id}
              onClick={() => setFilterAgent(filterAgent === agent._id ? null : agent._id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                filterAgent === agent._id ? "bg-blue-500/10 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span>{agent.icon}</span>
              {agent.name}
            </button>
          ))}
        </div>
      )}

      {/* Activity list */}
      <div className="divide-y divide-white/5">
        {activities.map((activity) => {
          const tc = typeConfig[activity.type] ?? typeConfig.error;
          const Icon = tc.icon;
          const taskId = activity.metadata?.taskId;

          return (
            <div
              key={activity._id}
              className="flex items-start gap-3 py-3 px-1 group"
            >
              {/* Agent icon */}
              <div className="relative flex-shrink-0">
                <span className="text-lg">{activity.agentIcon}</span>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ${tc.bg} ring-1 ring-[#111]`}>
                  <Icon className={`w-2 h-2 ${tc.color}`} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-300">{activity.agentName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${tc.bg} ${tc.color}`}>{tc.label}</span>
                </div>
                <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">{activity.summary}</p>
                {activity.metadata?.tokensUsed && (
                  <span className="text-[10px] text-zinc-600 mt-0.5 inline-block">
                    {activity.metadata.tokensUsed.toLocaleString()} tokens
                  </span>
                )}
              </div>

              {/* Time + link */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] text-zinc-600">{timeAgo(activity.createdAt)}</span>
                {taskId && (
                  <Link
                    href="/tasks"
                    className="text-[10px] text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View task →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
