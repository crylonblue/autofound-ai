"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  ListTodo,
  MessageSquare,
  GitBranchPlus,
  Plus,
  Play,
  Pause,
  Activity,
  Zap,
  ArrowRight,
} from "lucide-react";

// Demo data until Convex is connected
const demoAgents = [
  { id: "1", name: "CEO Agent", role: "CEO", icon: "👔", status: "active" as const, department: "executive", tasksCompleted: 12, tokensUsed: 45200 },
  { id: "2", name: "Content Writer", role: "Writer", icon: "✍️", status: "active" as const, department: "marketing", tasksCompleted: 8, tokensUsed: 32100 },
  { id: "3", name: "SEO Specialist", role: "SEO", icon: "🔍", status: "active" as const, department: "marketing", tasksCompleted: 5, tokensUsed: 18700 },
];

const demoActivity = [
  { id: "1", agent: "CEO Agent", icon: "👔", action: "Delegated blog post task to Content Writer", time: "2 min ago", type: "task" },
  { id: "2", agent: "Content Writer", icon: "✍️", action: "Completed: '5 AI Trends for 2026' blog post", time: "8 min ago", type: "completed" },
  { id: "3", agent: "SEO Specialist", icon: "🔍", action: "Sent keyword report to Content Writer", time: "15 min ago", type: "message" },
  { id: "4", agent: "CEO Agent", icon: "👔", action: "Escalated pricing decision to founder", time: "1 hr ago", type: "escalation" },
  { id: "5", agent: "Content Writer", icon: "✍️", action: "Started working on social media posts", time: "1 hr ago", type: "task" },
];

const demoTasks = [
  { id: "1", title: "Write weekly blog post", assignee: "Content Writer", status: "in_progress", priority: "high" },
  { id: "2", title: "Keyword research for Q1", assignee: "SEO Specialist", status: "pending", priority: "normal" },
  { id: "3", title: "Review department reports", assignee: "CEO Agent", status: "needs_approval", priority: "urgent" },
];

export default function DashboardPage() {
  const [companyName] = useState("My AI Company");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{companyName}</h1>
          <p className="text-zinc-400 text-sm mt-1">Your AI workforce is running</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors">
            <Pause className="w-4 h-4" />
            Pause All
          </button>
          <Link
            href="/agents"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Hire Agent
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Agents", value: demoAgents.length, icon: Users, color: "text-blue-400" },
          { label: "Tasks Today", value: 15, icon: ListTodo, color: "text-emerald-400" },
          { label: "Messages", value: 42, icon: MessageSquare, color: "text-purple-400" },
          { label: "Tokens Used", value: "96K", icon: Zap, color: "text-amber-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="col-span-2 bg-white/[0.03] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Activity Feed
            </h2>
            <span className="text-xs text-zinc-500">Live</span>
          </div>
          <div className="divide-y divide-white/5">
            {demoActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-zinc-200">{item.agent}</span>{" "}
                    <span className="text-zinc-400">{item.action}</span>
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">{item.time}</p>
                </div>
                {item.type === "escalation" && (
                  <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">
                    Needs Review
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Agents */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Active Agents
              </h2>
              <Link href="/agents" className="text-xs text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {demoAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 p-4">
                  <span className="text-xl">{agent.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-zinc-500">{agent.department}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-400" />
                Pending Tasks
              </h2>
              <Link href="/tasks" className="text-xs text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {demoTasks.map((task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{task.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.priority === "urgent"
                        ? "bg-red-500/10 text-red-400"
                        : task.priority === "high"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{task.assignee}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/org-chart"
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm"
              >
                <span className="flex items-center gap-2">
                  <GitBranchPlus className="w-4 h-4 text-blue-400" />
                  Edit Org Chart
                </span>
                <ArrowRight className="w-3 h-3 text-zinc-600" />
              </Link>
              <Link
                href="/tasks"
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Create Task
                </span>
                <ArrowRight className="w-3 h-3 text-zinc-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
