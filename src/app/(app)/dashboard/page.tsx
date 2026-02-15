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
  Loader2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import OnboardingChecklist from "../../components/OnboardingChecklist";

function useClerkUser() {
  return useUser();
}

const statusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-zinc-400", bg: "bg-zinc-500/10" },
  running: { color: "text-blue-400", bg: "bg-blue-500/10" },
  needs_approval: { color: "text-amber-400", bg: "bg-amber-500/10" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  failed: { color: "text-red-400", bg: "bg-red-500/10" },
};

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const clerkId = clerkUser?.id ?? "";

  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const tasks = useQuery(api.tasks.listTasksWithAgents, clerkId ? { clerkId } : "skip");

  if (!isLoaded) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const activeAgents = agents?.filter((a) => a.status === "active") ?? [];
  const completedTasks = tasks?.filter((t) => t.status === "completed") ?? [];
  const pendingTasks = tasks?.filter((t) => t.status === "pending" || t.status === "needs_approval") ?? [];
  const recentTasks = [...(tasks ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {activeAgents.length > 0
              ? `${activeAgents.length} agent${activeAgents.length !== 1 ? "s" : ""} active`
              : "Get started by hiring your first agent"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/agents"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Hire Agent
          </Link>
        </div>
      </div>

      {/* Onboarding */}
      <OnboardingChecklist />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Agents", value: activeAgents.length, icon: Users, color: "text-blue-400" },
          { label: "Total Tasks", value: tasks?.length ?? 0, icon: ListTodo, color: "text-emerald-400" },
          { label: "Completed", value: completedTasks.length, icon: Zap, color: "text-purple-400" },
          { label: "Pending", value: pendingTasks.length, icon: Activity, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recent Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No tasks yet. <Link href="/tasks" className="text-blue-400 hover:underline">Create one</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentTasks.map((task) => {
                const sc = statusColors[task.status] ?? statusColors.pending;
                return (
                  <div key={task._id} className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                    <span className="text-xl mt-0.5">{task.agentIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{task.agentName} · {new Date(task.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} capitalize`}>
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Agents */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Agents
              </h2>
              <Link href="/agents" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
            </div>
            {(!agents || agents.length === 0) ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                No agents yet. <Link href="/agents" className="text-blue-400 hover:underline">Hire one</Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent._id} className="flex items-center gap-3 p-4">
                    <span className="text-xl">{agent.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-zinc-500">{agent.role}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
