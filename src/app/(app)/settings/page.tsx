"use client";

import { useState } from "react";
import { Key, Globe, Shield, Bell, Save, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("api-keys");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [keys, setKeys] = useState({
    openai: "",
    anthropic: "",
    google: "",
  });
  const [company, setCompany] = useState({
    name: "My AI Company",
    defaultModel: "claude-sonnet-4-20250514",
    approvalMode: "external",
    timezone: "Europe/Berlin",
  });

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "company", label: "Company", icon: Globe },
    { id: "approvals", label: "Approvals", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure your AI company</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="flex gap-8">
        {/* Tab nav */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "api-keys" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">API Keys (BYOK)</h2>
                <p className="text-sm text-zinc-400 mb-6">Your keys are encrypted and never leave your browser. We never proxy your API calls.</p>
              </div>

              {[
                { key: "openai", label: "OpenAI", placeholder: "sk-...", description: "GPT-4o, GPT-4o-mini, o1" },
                { key: "anthropic", label: "Anthropic", placeholder: "sk-ant-...", description: "Claude Opus, Sonnet, Haiku" },
                { key: "google", label: "Google AI", placeholder: "AIza...", description: "Gemini Pro, Gemini Flash" },
              ].map((provider) => (
                <div key={provider.key} className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{provider.label}</h3>
                      <p className="text-xs text-zinc-500">{provider.description}</p>
                    </div>
                    {keys[provider.key as keyof typeof keys] && (
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Connected</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys[provider.key] ? "text" : "password"}
                      value={keys[provider.key as keyof typeof keys]}
                      onChange={(e) => setKeys({ ...keys, [provider.key]: e.target.value })}
                      placeholder={provider.placeholder}
                      className="w-full px-3 py-2.5 pr-10 bg-white/[0.03] border border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                      onClick={() => setShowKeys({ ...showKeys, [provider.key]: !showKeys[provider.key] })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                    >
                      {showKeys[provider.key] ? <EyeOff className="w-4 h-4 text-zinc-500" /> : <Eye className="w-4 h-4 text-zinc-500" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Company Settings</h2>
                <p className="text-sm text-zinc-400 mb-6">General configuration for your AI company.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Company Name</label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Default Model</label>
                  <select
                    value={company.defaultModel}
                    onChange={(e) => setCompany({ ...company, defaultModel: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                    <option value="claude-opus-4-6">Claude Opus 4</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Timezone</label>
                  <select
                    value={company.timezone}
                    onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "approvals" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Approval Settings</h2>
                <p className="text-sm text-zinc-400 mb-6">Control which actions need your sign-off.</p>
              </div>

              <div className="space-y-3">
                {[
                  { mode: "all", label: "Approve Everything", desc: "Every agent action requires your approval. Maximum control." },
                  { mode: "external", label: "External Actions Only", desc: "Only approve emails, posts, and other external actions. Internal work flows freely." },
                  { mode: "none", label: "Full Autonomy", desc: "Agents operate independently. You review results, not actions." },
                ].map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => setCompany({ ...company, approvalMode: opt.mode })}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      company.approvalMode === opt.mode
                        ? "border-blue-500/50 bg-blue-500/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        company.approvalMode === opt.mode ? "border-blue-500 bg-blue-500" : "border-zinc-600"
                      }`} />
                      <div>
                        <h3 className="text-sm font-semibold">{opt.label}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Notifications</h2>
                <p className="text-sm text-zinc-400 mb-6">Choose what you want to be notified about.</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Task completed", desc: "When an agent finishes a task", default: true },
                  { label: "Approval needed", desc: "When an action needs your sign-off", default: true },
                  { label: "Escalation", desc: "When an agent escalates an issue to you", default: true },
                  { label: "Daily summary", desc: "Daily digest of all agent activity", default: false },
                  { label: "Cost alerts", desc: "When token spending exceeds threshold", default: true },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                    <div>
                      <h3 className="text-sm font-medium">{n.label}</h3>
                      <p className="text-xs text-zinc-500">{n.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={n.default} className="sr-only peer" />
                      <div className="w-9 h-5 bg-zinc-700 peer-checked:bg-blue-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
