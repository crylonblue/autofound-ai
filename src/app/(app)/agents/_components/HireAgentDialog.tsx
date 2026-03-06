"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MODELS } from "@/lib/models";
import { DEFAULT_SKILLS, type SkillPackKey } from "@/lib/skillPacks";
import { SkillSelector } from "@/components/SkillSelector";
import { ModelPicker } from "@/components/ModelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ModelPreviewCanvas = dynamic(
  () => import("@/components/ModelPicker").then((m) => ({ default: m.ModelPreviewCanvas })),
  { ssr: false }
);

const templates = [
  { name: "CEO Agent", role: "CEO", icon: "ceo", color: "#3b82f6", systemPrompt: "You are a CEO agent responsible for strategic oversight, task delegation, and department coordination. Make decisions that align with business goals." },
  { name: "Content Writer", role: "Writer", icon: "marketing", color: "#8b5cf6", systemPrompt: "You are a content writer. Write engaging blog posts, marketing copy, and social media content. Be creative, clear, and SEO-aware." },
  { name: "SEO Specialist", role: "SEO", icon: "dev", color: "#10b981", systemPrompt: "You are an SEO specialist. Conduct keyword research, optimize content for search engines, and provide actionable SEO recommendations." },
  { name: "Developer", role: "Developer", icon: "dev", color: "#f59e0b", systemPrompt: "You are a software developer. Write clean, efficient code. Debug issues methodically and suggest best practices." },
  { name: "Sales Agent", role: "Sales", icon: "sales", color: "#ef4444", systemPrompt: "You are a sales agent. Research leads, craft outreach emails, and manage pipeline. Be persuasive but professional." },
  { name: "Bookkeeper", role: "Finance", icon: "dev", color: "#06b6d4", systemPrompt: "You are a bookkeeper. Track finances, generate reports, and monitor expenses. Be precise and detail-oriented." },
  { name: "Customer Support", role: "Support", icon: "sales", color: "#14b8a6", systemPrompt: "You are a customer support agent. Handle inquiries with empathy and efficiency. Escalate complex issues appropriately." },
  { name: "Data Analyst", role: "Analytics", icon: "dev", color: "#ec4899", systemPrompt: "You are a data analyst. Analyze data, identify trends, and provide actionable insights with clear visualizations." },
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

const emptyForm: AgentForm = { name: "", role: "", icon: "dev", color: "#3b82f6", systemPrompt: "", model: "claude-opus-4-6", skills: [...DEFAULT_SKILLS] };

interface HireAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
}

export function HireAgentDialog({ open, onOpenChange, clerkId }: HireAgentDialogProps) {
  const createAgent = useMutation(api.agents.createAgentByClerk);
  const [form, setForm] = useState<AgentForm>(emptyForm);
  const [saving, setSaving] = useState(false);

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
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to hire agent:", e);
      toast.error("Failed to hire agent. Please try again.");
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
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm(emptyForm); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Hire an Agent</DialogTitle>
          <DialogDescription>Choose from templates or create custom</DialogDescription>
        </DialogHeader>

        {/* Templates */}
        <div className="grid grid-cols-2 gap-3">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => hireFromTemplate(t)}
              disabled={saving}
              className="text-left p-3 rounded-xl border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all disabled:opacity-50 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-lg bg-[#12121e] overflow-hidden flex-shrink-0">
                <ModelPreviewCanvas modelId={t.icon} className="w-full h-full" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Custom agent form */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="font-semibold text-sm mb-4">Or create custom agent</h3>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
              <TabsTrigger value="skills" className="flex-1">Skills</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Marketing" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Character Model</Label>
                <ModelPicker value={form.icon} onChange={(id) => setForm({ ...form, icon: id })} />
              </div>
              <div className="space-y-1.5">
                <Label>LLM Model</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>System Prompt</Label>
                <Textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder="Instructions for this agent..." rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-3">
              <SkillSelector selected={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
            </TabsContent>
          </Tabs>

          <Button onClick={hireCustom} disabled={!form.name || !form.role || saving} className="w-full mt-4">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Custom Agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
