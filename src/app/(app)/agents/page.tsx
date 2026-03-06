"use client";

import { useState } from "react";
import { Search, Play, Pause, Trash2, Edit2, Loader2, MessageSquare, Heart, Send } from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { type SkillPackKey, DEFAULT_SKILLS } from "../../../lib/skillPacks";
import { estimateCost, formatTokens, formatCost } from "../../../lib/tokenCost";
import { MODELS } from "@/lib/models";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AgentAvatar } from "@/components/AgentAvatar";
import dynamic from "next/dynamic";

const ModelPreviewCanvas = dynamic(
  () => import("@/components/ModelPicker").then((m) => ({ default: m.ModelPreviewCanvas })),
  { ssr: false }
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { HireAgentDialog } from "./_components/HireAgentDialog";
import { EditAgentDialog } from "./_components/EditAgentDialog";
import { TelegramDialog } from "./_components/TelegramDialog";

function AgentCostBadge({ agentId, clerkId }: { agentId: Id<"agents">; clerkId: string }) {
  const usage = useQuery(api.messages.getUsageByAgent, clerkId ? { agentId, clerkId } : "skip");
  if (!usage || usage.totalTokens === 0) return null;
  const cost = estimateCost(usage.totalInputTokens, usage.totalOutputTokens, usage.lastModel, usage.lastProvider);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
      ⚡ {formatTokens(usage.totalTokens)} · ~{formatCost(cost)}
    </span>
  );
}

export default function AgentsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const clerkId = clerkUser?.id ?? "";

  const agents = useQuery(api.agents.listAgentsByClerk, clerkId ? { clerkId } : "skip");
  const heartbeats = useQuery(api.heartbeats.listByUser, clerkId ? { clerkId } : "skip");
  const togglePause = useMutation(api.heartbeats.togglePause);
  const updateAgent = useMutation(api.agents.updateAgent);
  const deleteAgent = useMutation(api.agents.deleteAgent);

  const [showHire, setShowHire] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<Id<"agents"> | null>(null);
  const [editData, setEditData] = useState<{ name: string; role: string; icon: string; color: string; systemPrompt: string; model: string; skills: SkillPackKey[] } | null>(null);
  const [search, setSearch] = useState("");
  const [telegramModal, setTelegramModal] = useState<{ agentId: Id<"agents">; botUsername?: string } | null>(null);

  const openEdit = (agent: NonNullable<typeof agents>[number]) => {
    setEditingId(agent._id);
    setEditData({
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

  const handleToggle = async (agentId: Id<"agents">, currentStatus: string) => {
    await updateAgent({ agentId, status: currentStatus === "active" ? "paused" : "active" });
  };

  const handleDelete = async (agentId: Id<"agents">) => {
    await deleteAgent({ agentId });
  };

  if (!isLoaded) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const heartbeatMap = new Map(
    (heartbeats ?? []).map((hb: any) => [hb?.agentId, hb])
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
    (a: any) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Agents"
        subtitle={`${agents?.length ?? 0} agents in your company`}
      >
        <Button onClick={() => setShowHire(true)} disabled={!clerkId}>
          Hire Agent
        </Button>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty state */}
      {agents && agents.length === 0 && (
        <EmptyState
          icon="🤖"
          title="No agents yet. Hire your first one!"
          action={{ label: "Hire Your First Agent", onClick: () => setShowHire(true) }}
        />
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((agent: any) => (
          <Card key={agent._id} className="hover:border-white/20 transition-colors group py-0 gap-0 overflow-hidden">
            <CardContent className="p-0">
              {/* 3D Model Preview */}
              <div className="relative h-36 bg-[#12121e] rounded-t-xl overflow-hidden">
                <ModelPreviewCanvas
                  modelId={agent.icon}
                  className="w-full h-full"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(agent)}>
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(agent._id, agent.status)}>
                        {agent.status === "active" ? <Pause className="w-3.5 h-3.5 text-zinc-400" /> : <Play className="w-3.5 h-3.5 text-zinc-400" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{agent.status === "active" ? "Pause" : "Resume"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-500/10" onClick={() => handleDelete(agent._id)}>
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm">{agent.name}</h3>
                <span className="text-xs text-muted-foreground">· {agent.role}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : agent.status === "paused" ? "bg-amber-400" : "bg-zinc-600"}`} />
                <span className="text-xs text-zinc-400 capitalize">{agent.status}</span>
                <span className="text-xs text-zinc-600">·</span>
                <span className="text-xs text-zinc-500">{MODELS.find(m => m.value === agent.model)?.label ?? agent.model ?? "Default"}</span>
                {clerkId && <AgentCostBadge agentId={agent._id} clerkId={clerkId} />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{agent.systemPrompt}</p>
              {/* Heartbeat status */}
              {(() => {
                const hb: any = heartbeatMap.get(agent._id);
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
                <Button asChild size="sm" variant="ghost" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-400">
                  <Link href={`/agents/${agent._id}/chat`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                  </Link>
                </Button>
                {agent.telegramBotUsername ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-400 text-[10px]"
                    onClick={() => setTelegramModal({ agentId: agent._id, botUsername: agent.telegramBotUsername })}
                  >
                    <Send className="w-3 h-3" /> @{agent.telegramBotUsername}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 hover:text-cyan-400"
                    onClick={() => setTelegramModal({ agentId: agent._id })}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Telegram
                  </Button>
                )}
              </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <HireAgentDialog open={showHire} onOpenChange={setShowHire} clerkId={clerkId} />

      <EditAgentDialog
        open={showEdit}
        onOpenChange={(v) => { setShowEdit(v); if (!v) setEditingId(null); }}
        agentId={editingId}
        initialData={editData}
      />

      {telegramModal && (
        <TelegramDialog
          open={!!telegramModal}
          onOpenChange={(v) => { if (!v) setTelegramModal(null); }}
          agentId={telegramModal.agentId}
          botUsername={telegramModal.botUsername}
        />
      )}
    </div>
  );
}
