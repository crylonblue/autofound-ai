"use client";

import { useState } from "react";
import { Plus, Search, Play, Pause, Trash2, X, Edit2, Loader2, MessageSquare, Heart, Send, Check } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { SKILL_PACKS, ALL_SKILL_KEYS, DEFAULT_SKILLS, type SkillPackKey } from "../../../lib/skillPacks";

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
  skills: SkillPackKey[];
};

const emptyForm: AgentForm = { name: "", role: "", icon: "🤖", color: "#3b82f6", systemPrompt: "", model: "claude-opus-4-6", skills: [...DEFAULT_SKILLS] };

export default function AgentsPage() {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const clerkId = clerkUser?.id ?? "";

  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const heartbeats = useQuery(api.heartbeats.listByUser, clerkId ? { clerkId } : "skip");
  const togglePause = useMutation(api.heartbeats.togglePause);
  const createAgent = useMutation(api.agents.createAgentByClerk);
  const updateAgent = useMutation(api.agents.updateAgent);
  const deleteAgent = useMutation(api.agents.deleteAgent);

  const [showHire, setShowHire] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<Id<"agents"> | null>(null);
  const [form, setForm] = useState<AgentForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [telegramModal, setTelegramModal] = useState<{ agentId: Id<"agents">; botUsername?: string } | null>(null);
  const [botTokenInput, setBotTokenInput] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(false);
  const registerWebhook = useAction(api.telegramActions.registerWebhook);
  const unregisterWebhook = useAction(api.telegramActions.unregisterWebhook);

  const openEdit = (agent: NonNullable<typeof agents>[number]) => {
    setEditingId(agent._id);
    setForm({
      name: agent.name,
      role: agent.role,
      icon: agent.icon,
      color: agent.color,
      systemPrompt: agent.systemPrompt,
      model: agent.model || "claude-opus-4-6",
      skills: (agent.tools as SkillPackKey[] | undefined) ?? [...DEFAULT_SKILLS],
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
        model: "claude-opus-4-6",
        tools: [...DEFAULT_SKILLS],
        status: "active",
      });
      setShowHire(false);
    } catch (e) {
      console.error("Failed to hire agent:", e);
      alert("Failed to hire agent. Please try again.");
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
        tools: form.skills,
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
        tools: form.skills,
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

  const heartbeatMap = new Map(
    (heartbeats ?? []).map((hb) => [hb?.agentId, hb])
  );

  const formatTimeAgo = (ts?: number) => {
    if (!ts) return "Never";
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

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
            <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{agent.systemPrompt}</p>
            {/* Heartbeat status */}
            {(() => {
              const hb = heartbeatMap.get(agent._id);
              if (!hb) return null;
              return (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => togglePause({ agentId: agent._id })}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                      hb.status === "active" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : hb.status === "running" ? "bg-blue-500/10 text-blue-400"
                      : "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20"
                    }`}
                    title={hb.status === "paused" ? "Resume heartbeat" : "Pause heartbeat"}
                  >
                    {hb.status === "running" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Heart className={`w-3 h-3 ${hb.status === "active" ? "fill-emerald-400" : ""}`} />
                    )}
                    {hb.status === "active" ? "Active" : hb.status === "running" ? "Running" : "Paused"}
                  </button>
                  <span className="text-[10px] text-zinc-600">
                    {hb.lastRun ? `Last: ${formatTimeAgo(hb.lastRun)}` : "No check-ins yet"}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-2">
              <Link
                href={`/agents/${agent._id}/chat`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </Link>
              {agent.telegramBotUsername ? (
                <button
                  onClick={() => setTelegramModal({ agentId: agent._id, botUsername: agent.telegramBotUsername })}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] hover:bg-emerald-500/20 transition-colors"
                >
                  <Send className="w-3 h-3" /> @{agent.telegramBotUsername} ✓
                </button>
              ) : (
                <button
                  onClick={() => { setBotTokenInput(""); setTelegramModal({ agentId: agent._id }); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-600/30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </button>
              )}
            </div>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Icon</label>
                    <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500/50" />
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
                {/* Skills */}
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Skills</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SKILL_KEYS.map((key) => {
                      const pack = SKILL_PACKS[key];
                      const active = form.skills.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              skills: active
                                ? form.skills.filter((s) => s !== key)
                                : [...form.skills, key],
                            })
                          }
                          className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                            active
                              ? "border-blue-500/50 bg-blue-500/10"
                              : "border-white/10 bg-white/[0.02] hover:border-white/20"
                          }`}
                        >
                          <span className="text-lg">{pack.icon}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-medium">{pack.name}</div>
                            <div className="text-[10px] text-zinc-500 truncate">{pack.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={hireCustom} disabled={!form.name || !form.role || saving} className="w-full py-2.5 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Custom Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Bot Token Modal */}
      {telegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Telegram Integration</h2>
              <button onClick={() => setTelegramModal(null)} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
            </div>
            {telegramModal.botUsername ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4 text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Connected as @{telegramModal.botUsername}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  Users can message this agent via Telegram by chatting with @{telegramModal.botUsername}.
                </p>
                <button
                  onClick={async () => {
                    setTelegramLoading(true);
                    try {
                      await unregisterWebhook({ agentId: telegramModal.agentId });
                      setTelegramModal(null);
                    } catch (e: any) {
                      alert("Failed to disconnect: " + e.message);
                    } finally {
                      setTelegramLoading(false);
                    }
                  }}
                  disabled={telegramLoading}
                  className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full"
                >
                  {telegramLoading && <Loader2 className="w-4 h-4 animate-spin" />} Disconnect
                </button>
              </div>
            ) : (
              <div>
                <div className="text-xs text-zinc-400 space-y-2 mb-4">
                  <p>To connect this agent to Telegram:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open <a href="https://t.me/BotFather" target="_blank" className="text-cyan-400 hover:underline">@BotFather</a> on Telegram</li>
                    <li>Send <code className="bg-white/10 px-1 rounded">/newbot</code> and follow the prompts</li>
                    <li>Copy the bot token and paste it below</li>
                  </ol>
                </div>
                <input
                  type="text"
                  value={botTokenInput}
                  onChange={(e) => setBotTokenInput(e.target.value)}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm font-mono mb-3 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={async () => {
                    if (!botTokenInput.trim()) return;
                    setTelegramLoading(true);
                    try {
                      const result = await registerWebhook({ agentId: telegramModal.agentId, botToken: botTokenInput.trim() });
                      setTelegramModal({ agentId: telegramModal.agentId, botUsername: result.botUsername });
                      setBotTokenInput("");
                    } catch (e: any) {
                      alert("Failed to connect: " + e.message);
                    } finally {
                      setTelegramLoading(false);
                    }
                  }}
                  disabled={telegramLoading || !botTokenInput.trim()}
                  className="w-full py-2.5 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {telegramLoading && <Loader2 className="w-4 h-4 animate-spin" />} Connect
                </button>
              </div>
            )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Icon</label>
                  <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-center focus:outline-none focus:border-blue-500/50" />
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
              {/* Skills */}
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Skills</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SKILL_KEYS.map((key) => {
                    const pack = SKILL_PACKS[key];
                    const active = form.skills.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            skills: active
                              ? form.skills.filter((s) => s !== key)
                              : [...form.skills, key],
                          })
                        }
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <span className="text-lg">{pack.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium">{pack.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{pack.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
