"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decrypt } from "./crypto";

export const runHeartbeat = action({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check heartbeat status
    const hb = await ctx.runQuery(api.heartbeats.getByAgent, { agentId: args.agentId });
    if (!hb || hb.status === "paused") return;

    // Mark as running
    await ctx.runMutation(internal.heartbeats.setStatus, { agentId: args.agentId, status: "running" });

    try {
      // Get agent config
      const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
      if (!agent) return;

      // Get user for API key
      const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
      if (!user) return;

      // Get pending tasks
      const tasks = await ctx.runQuery(api.tasks.getTasksByAgent, { agentId: args.agentId });
      const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "running");

      // Get recent messages
      const messages = await ctx.runQuery(api.messages.list, { agentId: args.agentId, clerkId: args.clerkId });
      const recentMessages = messages.slice(-10);

      // Load memory and soul from R2
      let memory = "";
      let soul = "";
      try {
        const [soulContent, memoryContent] = await Promise.all([
          ctx.runAction(api.r2.readFile, {
            clerkId: args.clerkId,
            key: `agents/${args.agentId}/SOUL.md`,
          }),
          ctx.runAction(api.r2.readFile, {
            clerkId: args.clerkId,
            key: `agents/${args.agentId}/MEMORY.md`,
          }),
        ]);
        soul = soulContent ?? "";
        memory = memoryContent ?? "";
      } catch { /* R2 failure — continue with defaults */ }

      // Build prompt
      const taskList = pendingTasks.length > 0
        ? pendingTasks.map((t) => `- [${t.status}] ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n")
        : "No pending tasks.";

      const msgList = recentMessages.length > 0
        ? recentMessages.map((m) => `[${m.role}] ${m.content}`).join("\n")
        : "No new messages.";

      const baseIdentity = soul ? soul.slice(0, 2000) : agent.systemPrompt;

      const prompt = `You are ${agent.name}, a ${agent.role}. This is your regular 30-minute check-in.

Current time: ${new Date().toISOString()}

${baseIdentity}

## Pending Tasks
${taskList}

## Recent Messages
${msgList}

## Your Memory
${memory ? memory.slice(0, 4000) : "No memory yet."}

---
Check your tasks, review any messages, and do proactive work if needed.
If you did something, describe what you did briefly.
If nothing needs attention, say "All clear, standing by."
Update your memory if you learned anything worth remembering.`;

      // Determine provider from agent model
      const model = agent.model || "gpt-4o-mini";
      let provider: "openai" | "anthropic" | "google";
      if (model.startsWith("claude")) provider = "anthropic";
      else if (model.startsWith("gemini")) provider = "google";
      else provider = "openai";

      // Get decrypted key
      const encryptedKey = await ctx.runQuery(internal.users.getEncryptedKey, {
        clerkId: args.clerkId,
        provider,
      });
      if (!encryptedKey) {
        await ctx.runMutation(api.heartbeats.recordHeartbeat, {
          agentId: args.agentId,
          lastResult: `No ${provider} API key configured.`,
        });
        return;
      }

      const apiKey = decrypt(encryptedKey);
      let result: string;

      if (provider === "openai") {
        result = await callOpenAI(apiKey, model, prompt);
      } else if (provider === "anthropic") {
        result = await callAnthropic(apiKey, model, prompt);
      } else {
        result = await callGoogle(apiKey, model, prompt);
      }

      // Record heartbeat result
      await ctx.runMutation(api.heartbeats.recordHeartbeat, {
        agentId: args.agentId,
        lastResult: result,
      });

      // If agent did something (not just "standing by"), store as system message
      const isIdle = result.toLowerCase().includes("all clear") && result.toLowerCase().includes("standing by");
      if (!isIdle) {
        await ctx.runMutation(api.messages.addAgentMessage, {
          agentId: args.agentId,
          clerkId: args.clerkId,
          content: `[Heartbeat] ${result}`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(api.heartbeats.recordHeartbeat, {
        agentId: args.agentId,
        lastResult: `Error: ${msg}`,
      });
    }
  },
});

// --- LLM Call Helpers ---

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callGoogle(apiKey: string, model: string, prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Google API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
