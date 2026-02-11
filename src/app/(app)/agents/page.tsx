"use client";

import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Play, Pause, Trash2, Settings, X } from "lucide-react";

const templates = [
  { slug: "ceo", name: "CEO Agent", role: "CEO", department: "executive", icon: "👔", color: "#3b82f6", description: "Strategic oversight, task delegation, and department coordination" },
  { slug: "content-writer", name: "Content Writer", role: "Writer", department: "marketing", icon: "✍️", color: "#8b5cf6", description: "Blog posts, social content, and marketing copy" },
  { slug: "seo-specialist", name: "SEO Specialist", role: "SEO", department: "marketing", icon: "🔍", color: "#10b981", description: "Keyword research, content optimization, and rankings" },
  { slug: "developer", name: "Developer", role: "Developer", department: "engineering", icon: "💻", color: "#f59e0b", description: "Code writing, debugging, and deployment" },
  { slug: "sales-agent", name: "Sales Agent", role: "Sales", department: "sales", icon: "🤝", color: "#ef4444", description: "Lead research, outreach, and pipeline management" },
  { slug: "bookkeeper", name: "Bookkeeper", role: "Bookkeeper", department: "finance", icon: "📊", color: "#06b6d4", description: "Financial tracking, reports, and expense monitoring" },
  { slug: "hr-manager", name: "HR Manager", role: "HR", department: "hr", icon: "👥", color: "#ec4899", description: "Team performance, workload monitoring, and scaling" },
  { slug: "support-agent", name: "Customer Support", role: "Support", department: "support", icon: "💬", color: "#14b8a6", description: "Ticket handling, customer inquiries, and issue escalation" },
];

type Agent = {
  id: string;
  name: string;
  role: string;
  department: string;
  icon: string;
  color: string;
  status: "active" | "paused" | "terminated";
  model: string;
  tasksCompleted: number;
  tokensUsed: number;
};

const demoAgents: Agent[] = [
  { id: "1", name: "CEO Agent", role: "CEO", department: "executive", icon: "👔", color: "#3b82f6", status: "active", model: "claude-sonnet-4-20250514", tasksCompleted: 12, tokensUsed: 45200 },
  { id: "2", name: "Content Writer", role: "Writer", department: "marketing", icon: "✍️", color: "#8b5cf6", status: "active", model: "gpt-4o", tasksCompleted: 8, tokensUsed: 32100 },
  { id: "3", name: "SEO Specialist", role: "SEO", department: "marketing", icon: "🔍", color: "#10b981", status: "active", model: "claude-sonnet-4-20250514", tasksCompleted: 5, tokensUsed: 18700 },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(demoAgents);
  const [showHire, setShowHire] = useState(false);
  const [search, setSearch] = useState("");

  const hireAgent = (template: typeof templates[0]) => {
    const newAgent: Agent = {
      id: String(Date.now()),
      name: template.name,
      role: template.role,
      department: template.department,
      icon: template.icon,
      color: template.color,
      status: "active",
      model: "claude-sonnet-4-20250514",
      tasksCompleted: 0,
      tokensUsed: 0,
    };
    setAgents([...agents, newAgent]);
    setShowHire(false);
  };

  const toggleStatus = (id: string) => {
    setAgents(agents.map(a =>
      a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a
    ));
  };

  const removeAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-zinc-400 text-sm mt-1">{agents.length} agents in your company</p>
        </div>
        <button
          onClick={() => setShowHire(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Hire Agent
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: agent.color + "20" }}
                >
                  {agent.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{agent.name}</h3>
                  <p className="text-xs text-zinc-500">{agent.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleStatus(agent.id)}
                  className="p-1.5 rounded-md hover:bg-white/10"
                  title={agent.status === "active" ? "Pause" : "Resume"}
                >
                  {agent.status === "active" ? (
                    <Pause className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </button>
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="p-1.5 rounded-md hover:bg-red-500/10"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : "bg-zinc-600"}`} />
              <span className="text-xs text-zinc-400 capitalize">{agent.status}</span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-500">{agent.model.split("-").slice(0, 2).join(" ")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-xs text-zinc-500">Tasks Done</p>
                <p className="text-sm font-semibold">{agent.tasksCompleted}</p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-xs text-zinc-500">Tokens</p>
                <p className="text-sm font-semibold">{(agent.tokensUsed / 1000).toFixed(1)}K</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hire Modal */}
      {showHire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold">Hire an Agent</h2>
                <p className="text-sm text-zinc-400 mt-1">Choose from templates or create custom</p>
              </div>
              <button onClick={() => setShowHire(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => hireAgent(t)}
                  className="text-left p-4 rounded-xl border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{t.name}</h3>
                      <p className="text-xs text-zinc-500">{t.department}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
