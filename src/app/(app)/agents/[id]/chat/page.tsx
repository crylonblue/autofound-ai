"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Send, Trash2, Loader2, Info, Zap } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import MarkdownMessage from "../../../../../components/MarkdownMessage";
import { estimateCost, formatTokens, formatCost } from "../../../../../lib/tokenCost";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const clerkId = clerkUser?.id ?? "";
  const agentId = id as Id<"agents">;

  const agent = useQuery(api.agents.getAgent, { agentId });
  const messages = useQuery(
    api.messages.list,
    clerkId ? { agentId, clerkId } : "skip"
  );
  const usageStats = useQuery(
    api.messages.getUsageStats,
    clerkId ? { agentId, clerkId } : "skip"
  );
  const sendMessage = useMutation(api.messages.send);
  const clearHistory = useMutation(api.messages.clearHistory);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : null;
  const isStreaming = lastMsg?.role === "agent" && lastMsg?.streaming === true;
  const agentThinking = !sending && !isStreaming && lastMsg?.role === "user";
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !clerkId || sending) return;
    setInput("");
    setSending(true);
    try {
      await sendMessage({ agentId, clerkId, content: text });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (!clerkId) return;
    await clearHistory({ agentId, clerkId });
  };

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full space-y-3">
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
    );
  }

  const sidebarContent = (
    <div className="p-5">
      <div className="flex flex-col items-center text-center mb-6">
        <AgentAvatar icon={agent.icon} color={agent.color} size="lg" className="mb-3" />
        <h3 className="font-semibold">{agent.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{agent.role}</p>
      </div>
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : agent.status === "paused" ? "bg-amber-400" : "bg-zinc-600"}`} />
            <span className="capitalize text-zinc-300">{agent.status}</span>
          </div>
        </div>
        {agent.model && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Model</p>
            <p className="text-zinc-300">{agent.model}</p>
          </div>
        )}
        {usageStats && usageStats.totalTokens > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Token Usage</p>
            <div className="space-y-1 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input</span>
                <span>{usageStats.totalInputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output</span>
                <span>{usageStats.totalOutputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10 font-medium">
                <span className="text-zinc-400">Total</span>
                <span>{usageStats.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10 font-medium text-amber-400">
                <span className="text-zinc-400">Est. Cost</span>
                <span>~{formatCost(estimateCost(usageStats.totalInputTokens, usageStats.totalOutputTokens, agent.model || undefined))}</span>
              </div>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1">System Prompt</p>
          <p className="text-zinc-400 text-xs leading-relaxed">{agent.systemPrompt}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => router.push("/agents")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to agents</TooltipContent>
          </Tooltip>
          <AgentAvatar icon={agent.icon} color={agent.color} size="sm" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{agent.name}</h2>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
          {usageStats && usageStats.totalTokens > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] rounded-lg text-xs text-zinc-400">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{formatTokens(usageStats.totalTokens)} tokens</span>
              <span className="text-zinc-600">·</span>
              <span>~{formatCost(estimateCost(usageStats.totalInputTokens, usageStats.totalOutputTokens, agent.model || undefined))}</span>
            </div>
          )}

          {/* Agent info sheet */}
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="w-4 h-4 text-zinc-400" />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent>Agent info</TooltipContent>
            </Tooltip>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Agent Info</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleClear} className="hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear chat</TooltipContent>
          </Tooltip>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-3">
            {messages && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <AgentAvatar icon={agent.icon} color={agent.color} size="lg" className="mb-4" />
                <p className="text-muted-foreground text-sm">
                  Say hello to <span className="font-semibold text-zinc-300">{agent.name}</span>!
                </p>
              </div>
            )}

            {messages?.map((msg: any) => (
              <div
                key={msg._id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md whitespace-pre-wrap"
                      : "bg-white/[0.07] text-zinc-200 rounded-bl-md"
                  }`}
                >
                  {msg.role === "agent" ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    msg.content
                  )}
                  {msg.streaming && (
                    <span className="inline-block w-[2px] h-[1.1em] bg-zinc-300 align-middle ml-0.5 animate-pulse" />
                  )}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                      {msg.toolCalls.map((tc: any, i: number) => (
                        <div key={i} className="text-xs text-zinc-400 font-mono">
                          🔧 {tc.tool}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.role === "agent" && (msg.inputTokens || msg.outputTokens) && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-500">
                      <Zap className="w-3 h-3" />
                      {((msg.inputTokens || 0) + (msg.outputTokens || 0)).toLocaleString()} tokens
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(sending || agentThinking) && (
              <div className="flex justify-start">
                <div className="bg-white/[0.07] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                    {agentThinking && (
                      <span className="text-xs text-zinc-500 ml-1">Thinking…</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              rows={1}
              className="flex-1 resize-none max-h-32 overflow-y-auto min-h-[42px]"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              size="icon"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
