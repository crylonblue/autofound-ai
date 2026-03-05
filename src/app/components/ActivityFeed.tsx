"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { Filter, Loader2 } from "lucide-react";
import { ACTIVITY_TYPE } from "@/lib/status";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

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
  compact?: boolean;
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
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-1">
            <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activity yet."
        description="Activity will appear here as your agents work."
      />
    );
  }

  return (
    <div>
      {/* Agent filter */}
      {!compact && agents && agents.length > 1 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <Filter className="w-3 h-3 text-zinc-500" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterAgent(null)}
            className={!filterAgent ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 hover:text-blue-400" : "text-zinc-500"}
          >
            All
          </Button>
          {agents.map((agent: any) => (
            <Button
              key={agent._id}
              variant="ghost"
              size="sm"
              onClick={() => setFilterAgent(filterAgent === agent._id ? null : agent._id)}
              className={filterAgent === agent._id ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 hover:text-blue-400" : "text-zinc-500"}
            >
              <span>{agent.icon}</span>
              {agent.name}
            </Button>
          ))}
        </div>
      )}

      {/* Activity list */}
      <div className="divide-y divide-white/5">
        {activities.map((activity: any) => {
          const tc = ACTIVITY_TYPE[activity.type as keyof typeof ACTIVITY_TYPE] ?? ACTIVITY_TYPE.error;
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
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${tc.bg} ${tc.color}`}>{tc.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{activity.summary}</p>
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
