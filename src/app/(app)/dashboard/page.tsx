"use client";

import Link from "next/link";
import {
  Users,
  ListTodo,
  Plus,
  Activity,
  Zap,
  ArrowRight,
  GitBranchPlus,
  Coins,
} from "lucide-react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import ActivityFeed from "../../components/ActivityFeed";
import { estimateCost, formatTokens, formatCost } from "../../../lib/tokenCost";
import { PageHeader } from "@/components/PageHeader";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const clerkId = clerkUser?.id ?? "";

  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const tasks = useQuery(api.tasks.listTasksWithAgents, clerkId ? { clerkId } : "skip");
  const usage = useQuery(api.messages.getUsageAllAgents, clerkId ? { clerkId } : "skip");

  if (!isLoaded) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeAgents = agents?.filter((a: any) => a.status === "active") ?? [];
  const completedTasks = tasks?.filter((t: any) => t.status === "completed") ?? [];
  const pendingTasks = tasks?.filter((t: any) => t.status === "pending" || t.status === "needs_approval") ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={
          activeAgents.length > 0
            ? `${activeAgents.length} agent${activeAgents.length !== 1 ? "s" : ""} active`
            : "Get started by hiring your first agent"
        }
      >
        <Button asChild>
          <Link href="/agents">
            <Plus className="w-4 h-4" />
            Hire Agent
          </Link>
        </Button>
      </PageHeader>

      <OnboardingChecklist />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Agents", value: String(activeAgents.length), icon: Users, color: "text-blue-400" },
          { label: "Total Tasks", value: String(tasks?.length ?? 0), icon: ListTodo, color: "text-emerald-400" },
          { label: "Tokens Used", value: usage ? formatTokens(usage.totalTokens) : "—", icon: Zap, color: "text-purple-400" },
          { label: "Est. Cost", value: usage ? formatCost(estimateCost(usage.totalInputTokens, usage.totalOutputTokens)) : "—", icon: Coins, color: "text-amber-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-blue-400" />
              Activity Feed
            </CardTitle>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Live</span>
          </CardHeader>
          <CardContent>
            <ActivityFeed compact limit={15} />
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Agents */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-blue-400" />
                Agents
              </CardTitle>
              <Link href="/agents" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
            </CardHeader>
            {(!agents || agents.length === 0) ? (
              <CardContent className="text-center text-muted-foreground text-sm py-6">
                No agents yet. <Link href="/agents" className="text-blue-400 hover:underline">Hire one</Link>
              </CardContent>
            ) : (
              <div className="divide-y divide-white/5">
                {agents.slice(0, 5).map((agent: any) => (
                  <div key={agent._id} className="flex items-center gap-3 p-4">
                    <AgentAvatar icon={agent.icon} color={agent.color} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Usage by Agent */}
          {usage && usage.agents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Usage by Agent
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-white/5">
                {usage.agents
                  .sort((a: any, b: any) => b.totalTokens - a.totalTokens)
                  .map((agent: any) => (
                    <div key={agent.agentId} className="flex items-center gap-3 p-4">
                      <AgentAvatar icon={agent.icon} color="#3b82f6" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTokens(agent.totalTokens)} tokens · {formatCost(estimateCost(agent.inputTokens, agent.outputTokens, agent.lastModel, agent.lastProvider))}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/org-chart" className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm">
                <span className="flex items-center gap-2"><GitBranchPlus className="w-4 h-4 text-blue-400" />Edit Org Chart</span>
                <ArrowRight className="w-3 h-3 text-zinc-600" />
              </Link>
              <Link href="/tasks" className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm">
                <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400" />Create Task</span>
                <ArrowRight className="w-3 h-3 text-zinc-600" />
              </Link>
              <Link href="/settings" className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm">
                <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" />API Keys</span>
                <ArrowRight className="w-3 h-3 text-zinc-600" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
