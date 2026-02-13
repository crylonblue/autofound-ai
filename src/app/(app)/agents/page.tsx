"use client";

import { useState } from "react";
import { Plus, Search, Play, Pause, Trash2, X, Edit2, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function useClerkUser() {
  return useUser();
}

const templates = [
  { name: "CEO Agent", role: "CEO", icon: "👔", color: "#3b82f6", systemPrompt: "You are a CEO agent responsible for strategic oversight, task delegation, and department coordination. Make decisions that align with business goals." },
  { name: "Content Writer", role: "Writer", icon: "✍️", color: "#8b5cf6", systemPrompt: "You are a content writer. Write engaging blog posts, marketing copy, and social media content. Be creative, clear, and SEO-aware." },
  { name: "SEO Specialist", role: "SEO", icon: "🔍", color: "#10b981", systemPrompt: "You are an SEO specialist. Conduct keyword research, optimize content for search engines, and provide actionable SEO recommendations." },
  { name: "Developer", role: "Developer", icon: "💻", color: "#f59e0b", systemPrompt: "You are a software developer. Write clean, efficient code. Debug issues methodically and suggest best practices." },
  { name: "Sales Agent", role: "Sales", icon: "🤝", color: "#ef4444", systemPrompt: "You are a sales agent. Research leads, craft outreach emails, and manage pipeline. Be persuasive but professional." },
  { name: "Bookkeeper", role: "Finance", icon: "📊", color: "#06b6d4", systemPrompt: "You are a bookkeeper. Track finances, generate reports, and monitor expenses. Be precise and detail-oriented." },
  { name: "Customer Support", role: "Support", icon: "💬", color: "#14b8a6", systemPrompt: "You are a customer support agent. Handle inquiries with empathy and efficiency. Escalate complex issues appropriately." },
  { name: "Data Analyst", role: "Analytics", icon: "📈", color: "#ec4899", systemPrompt: "You are a data analyst. Analyze data, identify trends, and provide actionable insights with clear visualizations." },
];

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" },
  { value: "claude-opus-4-6", label: "Claude Opus 4", provider: "anthropic" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google" },
];

type AgentForm = {
  name: string;
  role: string;
  icon: string;
  color: string;
  systemPrompt: string;
  model: string;
};

const emptyForm: AgentForm = { name: "", role: "", icon: "🤖", color: "#3b82f6", systemPrompt: "", model: "gpt-4o-mini" };

export default function AgentsPage() {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const clerkId = clerkUser?.id ?? "";

  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const createAgent = useMutation(api.agents.createAgentByClerk);
  const updateAgent = useMutation(api.agents.updateAgent);
  const deleteAgent = useMutation(api.agents.deleteAgent);

  const [showHire, setShowHire] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<Id<"agents"> | null>(null);
  const [form, setForm] = useState<AgentForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (agent: NonNullable<typeof agents>[number]) => {
    setEditingId(agent._id);
    setForm({
      name: agent.name,
      role: agent.role,
      icon: agent.icon,
      color: agent.color,
      systemPrompt: agent.systemPrompt,
      model: agent.model || "gpt-4o-mini",
    });
    setShowEdit(true);
  };

  const hireFromTemplate = async (t: typeof templates[number]) => {
    if (!clerkId) return;
    setSaving(true);
    try {
      await createAgent({
        clerkId,
        name: t.name,
        role: t.role,
        icon: t.icon,
        color: t.color,
        systemPrompt: t.systemPrompt,
        model: "gpt-4o-mini",
        status: "active",
      });
      setShowHire(false);
    } finally {
      setSaving(false);
    }
  };

  const hireCustom = async () => {
    if (!clerkId || !form.name || !form.role) return;
    setSaving(true);
    try {
      await createAgent({
        clerkId,
        name: form.name,
        role: form.role,
        icon: form.icon,
        color: form.color,
        systemPrompt: form.systemPrompt,
        model: form.model,
        status: "active",
      });
      setForm(emptyForm);
      setShowHire(false);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateAgent({
        agentId: editingId,
        name: form.name,
        role: form.role,
        icon: form.icon,
        color: form.color,
        systemPrompt: form.systemPrompt,
        model: form.model,
      });
      setShowEdit(false);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (agentId: Id<"agents">, currentStatus: string) => {
    await updateAgent({
      agentId,
      status: currentStatus === "active" ? "paused" : "active",
    });
  };

  const handleDelete = async (agentId: Id<"agents">) => {
    await deleteAgent({ agentId });
  };

  if (!isLoaded) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const filtered = agents?.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-zinc-400 text-sm mt-1">{agents?.length ?? 0} agents in your company</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowHire(true); }}
          disabled={!clerkId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Hire Agent
        </button>
      </div>

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

      {/* Empty state */}
      {agents && agents.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-zinc-500 text-sm mb-4">No agents yet. Hire your first one!</p>
          <button onClick={() => setShowHire(true)} className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500">
            Hire Your First Agent
          </button>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((agent) => (
          <div key={agent._id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: agent.color + "20" }}>
                  {agent.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{agent.name}</h3>
                  <p className="text-xs text-zinc-500">{agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(agent)} className="p-1.5 rounded-md hover:bg-white/10" title="Edit">
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                <button onClick={() => handleToggle(agent._id, agent.status)} className="p-1.5 rounded-md hover:bg-white/10" title={agent.status === "active" ? "Pause" : "Resume"}>
                  {agent.status === "active" ? <Pause className="w-3.5 h-3.5 text-zinc-400" /> : <Play className="w-3.5 h-3.5 text-zinc-400" />}
                </button>
                <button onClick={() => handleDelete(agent._id)} className="p-1.5 rounded-md hover:bg-red-500/10" title="Remove">
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : agent.status === "paused" ? "bg-amber-400" : "bg-zinc-600"}`} />
              <span className="text-xs text-zinc-400 capitalize">{agent.status}</span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-500">{MODELS.find(m => m.value === agent.model)?.label ?? agent.model ?? "Default"}</span>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-2">{agent.systemPrompt}</p>
          </div>
        ))}
      </div>

      {/* Hire Modal */}
      {showHire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold">Hire an Agent</h2>
                <p className="text-sm text-zinc-400 mt-1">Choose from templates or create custom</p>
              </div>
              <button onClick={() => setShowHire(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Templates */}
            <div className="p-6 grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => hireFromTemplate(t)}
                  disabled={saving}
                  className="text-left p-4 rounded-xl border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{t.name}</h3>
                      <p className="text-xs text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom agent form */}
            <div className="p-6 border-t border-white/10">
              <h3 className="font-semibold text-sm mb-4">Or create custom agent</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent name" className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Role</label>
                    <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Marketing" className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Icon</label>
                    <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Color</label>
                    <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-[38px] bg-white/[0.03] border border-white/10 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Model</label>
                    <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50">
                      {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">System Prompt</label>
                  <textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder="Instructions for this agent..." rows={3} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500/50" />
                </div>
                <button onClick={hireCustom} disabled={!form.name || !form.role || saving} className="w-full py-2.5 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Custom Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Edit Agent</h2>
              <button onClick={() => { setShowEdit(false); setEditingId(null); }} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Role</label>
                  <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Icon</label>
                  <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Color</label>
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-[38px] bg-white/[0.03] border border-white/10 rounded-lg cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Model</label>
                  <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50">
                    {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">System Prompt</label>
                <textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} rows={4} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500/50" />
              </div>
              <button onClick={saveEdit} disabled={saving} className="w-full py-2.5 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
