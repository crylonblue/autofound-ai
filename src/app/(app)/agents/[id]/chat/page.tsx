"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Send, Trash2, Loader2, Info } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

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
  const sendMessage = useMutation(api.messages.send);
  const clearHistory = useMutation(api.messages.clearHistory);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <button
            onClick={() => router.push("/agents")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: agent.color + "20" }}
          >
            {agent.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{agent.name}</h2>
            <p className="text-xs text-zinc-500">{agent.role}</p>
          </div>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Info className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ backgroundColor: agent.color + "20" }}
              >
                {agent.icon}
              </div>
              <p className="text-zinc-400 text-sm">
                Say hello to <span className="font-semibold text-zinc-300">{agent.name}</span>!
              </p>
            </div>
          )}

          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white/[0.07] text-zinc-200 rounded-bl-md"
                }`}
              >
                {msg.content}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                    {msg.toolCalls.map((tc, i) => (
                      <div key={i} className="text-xs text-zinc-400 font-mono">
                        🔧 {tc.tool}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/[0.07] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              rows={1}
              className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-500/50 max-h-32 overflow-y-auto"
              style={{ minHeight: "42px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:hover:bg-blue-600 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-72 border-l border-white/10 p-5 shrink-0 overflow-y-auto hidden md:block">
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3"
              style={{ backgroundColor: agent.color + "20" }}
            >
              {agent.icon}
            </div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-xs text-zinc-500 mt-1">{agent.role}</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    agent.status === "active"
                      ? "bg-emerald-400"
                      : agent.status === "paused"
                      ? "bg-amber-400"
                      : "bg-zinc-600"
                  }`}
                />
                <span className="capitalize text-zinc-300">{agent.status}</span>
              </div>
            </div>
            {agent.model && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Model</p>
                <p className="text-zinc-300">{agent.model}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 mb-1">System Prompt</p>
              <p className="text-zinc-400 text-xs leading-relaxed">{agent.systemPrompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
