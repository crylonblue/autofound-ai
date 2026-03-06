"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { MODELS } from "@/lib/models";
import { DEFAULT_SKILLS, type SkillPackKey } from "@/lib/skillPacks";
import { SkillSelector } from "@/components/SkillSelector";
import { ModelPicker } from "@/components/ModelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AgentForm = {
  name: string;
  role: string;
  icon: string;
  color: string;
  systemPrompt: string;
  model: string;
  skills: SkillPackKey[];
};

interface EditAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: Id<"agents"> | null;
  initialData: AgentForm | null;
}

export function EditAgentDialog({ open, onOpenChange, agentId, initialData }: EditAgentDialogProps) {
  const updateAgent = useMutation(api.agents.updateAgent);
  const [form, setForm] = useState<AgentForm>(initialData ?? { name: "", role: "", icon: "dev", color: "#3b82f6", systemPrompt: "", model: "claude-opus-4-6", skills: [...DEFAULT_SKILLS] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const saveEdit = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await updateAgent({
        agentId,
        name: form.name,
        role: form.role,
        icon: form.icon,
        color: form.color,
        systemPrompt: form.systemPrompt,
        model: form.model,
        tools: form.skills,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="skills" className="flex-1">Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
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
              <Textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} rows={4} />
            </div>
          </TabsContent>

          <TabsContent value="skills" className="space-y-3">
            <SkillSelector selected={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
          </TabsContent>
        </Tabs>

        <Button onClick={saveEdit} disabled={saving} className="w-full">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
        </Button>
      </DialogContent>
    </Dialog>
  );
}
