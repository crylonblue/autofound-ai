"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Globe, Shield, Bell, Save, Eye, EyeOff, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MODELS } from "@/lib/models";
import { Skeleton } from "@/components/ui/skeleton";

const PROVIDERS = [
  { key: "openai" as const, label: "OpenAI", placeholder: "sk-...", description: "GPT-4o, GPT-4o-mini, o1" },
  { key: "anthropic" as const, label: "Anthropic", placeholder: "sk-ant-...", description: "Claude Opus, Sonnet, Haiku" },
  { key: "google" as const, label: "Google AI", placeholder: "AIza...", description: "Gemini Pro, Gemini Flash" },
];

type Provider = "openai" | "anthropic" | "google";

export default function SettingsPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<Provider, string>>({ openai: "", anthropic: "", google: "" });
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { user: clerkUser, isLoaded } = useUser();
  const clerkId = clerkUser?.id ?? "";

  const createOrGetUser = useMutation(api.users.createOrGetUser);
  const saveEncryptedKey = useAction(api.crypto.saveEncryptedKey);
  const deleteApiKeyMut = useMutation(api.users.deleteApiKey);
  const apiKeys = useQuery(api.users.getApiKeys, clerkId ? { clerkId } : "skip");

  const ensureUser = useCallback(async () => {
    if (!clerkUser) return;
    await createOrGetUser({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name: clerkUser.fullName ?? undefined,
      imageUrl: clerkUser.imageUrl ?? undefined,
    });
  }, [clerkUser, createOrGetUser]);

  useEffect(() => {
    if (clerkUser) ensureUser();
  }, [clerkUser, ensureUser]);

  const handleSave = async (provider: Provider) => {
    if (!clerkId || !keyInputs[provider]) return;
    setSaving((s) => ({ ...s, [provider]: true }));
    try {
      await saveEncryptedKey({ clerkId, provider, key: keyInputs[provider].trim() });
      setKeyInputs((k) => ({ ...k, [provider]: "" }));
      toast.success(`${PROVIDERS.find((p) => p.key === provider)?.label} key saved!`);
    } finally {
      setSaving((s) => ({ ...s, [provider]: false }));
    }
  };

  const handleDelete = async (provider: Provider) => {
    if (!clerkId) return;
    setSaving((s) => ({ ...s, [provider]: true }));
    try {
      await deleteApiKeyMut({ clerkId, provider });
      toast.success("Key deleted.");
    } finally {
      setSaving((s) => ({ ...s, [provider]: false }));
    }
  };

  const [company, setCompany] = useState({
    name: "My AI Company",
    defaultModel: "claude-sonnet-4-20250514",
    approvalMode: "external",
    timezone: "Europe/Berlin",
  });

  if (!isLoaded) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Configure your AI company" />

      <Tabs defaultValue="api-keys" className="flex gap-8">
        <TabsList className="flex flex-col h-auto w-48 shrink-0 bg-transparent p-0 space-y-1">
          {[
            { id: "api-keys", label: "API Keys", icon: Key },
            { id: "company", label: "Company", icon: Globe },
            { id: "approvals", label: "Approvals", icon: Shield },
            { id: "notifications", label: "Notifications", icon: Bell },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="w-full justify-start gap-2.5 px-3 py-2.5 rounded-lg text-sm data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 data-[state=active]:shadow-none text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1">
          <TabsContent value="api-keys" className="mt-0 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">API Keys (BYOK)</h2>
              <p className="text-sm text-muted-foreground mb-6">Your keys are stored securely. We never proxy your API calls.</p>
              {!clerkId && (
                <p className="text-sm text-amber-400 mb-4">Sign in to manage your API keys.</p>
              )}
            </div>

            {PROVIDERS.map((provider) => {
              const maskedKey = apiKeys?.[provider.key];
              const hasKey = !!maskedKey;
              return (
                <Card key={provider.key}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{provider.label}</CardTitle>
                        <CardDescription>{provider.description}</CardDescription>
                      </div>
                      {hasKey && <Badge variant="secondary" className="text-emerald-400 bg-emerald-500/10">Connected</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hasKey && (
                      <div className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg font-mono text-sm text-muted-foreground">
                        {maskedKey}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKeys[provider.key] ? "text" : "password"}
                          value={keyInputs[provider.key]}
                          onChange={(e) => setKeyInputs({ ...keyInputs, [provider.key]: e.target.value })}
                          placeholder={hasKey ? "Enter new key to replace" : provider.placeholder}
                          disabled={!clerkId}
                          className="pr-10 font-mono"
                        />
                        <button
                          onClick={() => setShowKeys({ ...showKeys, [provider.key]: !showKeys[provider.key] })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                        >
                          {showKeys[provider.key] ? <EyeOff className="w-4 h-4 text-zinc-500" /> : <Eye className="w-4 h-4 text-zinc-500" />}
                        </button>
                      </div>
                      <Button
                        onClick={() => handleSave(provider.key)}
                        disabled={!clerkId || !keyInputs[provider.key] || saving[provider.key]}
                      >
                        {saving[provider.key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </Button>
                      {hasKey && (
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(provider.key)}
                          disabled={!clerkId || saving[provider.key]}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="company" className="mt-0 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Company Settings</h2>
              <p className="text-sm text-muted-foreground mb-6">General configuration for your AI company.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select value={company.defaultModel} onValueChange={(v) => setCompany({ ...company, defaultModel: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={company.timezone} onValueChange={(v) => setCompany({ ...company, timezone: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-0 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Approval Settings</h2>
              <p className="text-sm text-muted-foreground mb-6">Control which actions need your sign-off.</p>
            </div>
            <div className="space-y-3">
              {[
                { mode: "all", label: "Approve Everything", desc: "Every agent action requires your approval. Maximum control." },
                { mode: "external", label: "External Actions Only", desc: "Only approve emails, posts, and other external actions. Internal work flows freely." },
                { mode: "none", label: "Full Autonomy", desc: "Agents operate independently. You review results, not actions." },
              ].map((opt) => (
                <button key={opt.mode} onClick={() => setCompany({ ...company, approvalMode: opt.mode })} className={`w-full text-left p-4 rounded-xl border transition-colors ${company.approvalMode === opt.mode ? "border-blue-500/50 bg-blue-500/5" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${company.approvalMode === opt.mode ? "border-blue-500 bg-blue-500" : "border-zinc-600"}`} />
                    <div>
                      <h3 className="text-sm font-semibold">{opt.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Notifications</h2>
              <p className="text-sm text-muted-foreground mb-6">Choose what you want to be notified about.</p>
            </div>
            <div className="space-y-3">
              {[
                { id: "task-completed", label: "Task completed", desc: "When an agent finishes a task", default: true },
                { id: "approval-needed", label: "Approval needed", desc: "When an action needs your sign-off", default: true },
                { id: "escalation", label: "Escalation", desc: "When an agent escalates an issue to you", default: true },
                { id: "daily-summary", label: "Daily summary", desc: "Daily digest of all agent activity", default: false },
                { id: "cost-alerts", label: "Cost alerts", desc: "When token spending exceeds threshold", default: true },
              ].map((n) => (
                <Card key={n.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-sm font-medium">{n.label}</h3>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked={n.default} />
                </Card>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
