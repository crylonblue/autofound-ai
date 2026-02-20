"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decrypt } from "./crypto";
import { getEnabledTools, executeToolFromList } from "./tools/index";
import { getToolNamesFromSkills, getAllToolNames } from "./tools/skillPacks";
import { ToolDefinition } from "./tools/types";

const MAX_TOOL_ITERATIONS = 10;
const MAX_SOUL_CHARS = 2000;
const MAX_MEMORY_CHARS = 4000;

const RETRYABLE_STATUS_CODES = new Set([401, 429, 500, 502, 503, 529]);

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    for (const code of RETRYABLE_STATUS_CODES) {
      if (msg.includes(` ${code}:`)) return true;
    }
    if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(msg)) return true;
  }
  return false;
}

type ProviderConfig = { provider: "openai" | "anthropic" | "google"; model: string; apiKey: string };

function buildFailoverChain(
  preferredProvider: "openai" | "anthropic" | "google",
  preferredModel: string,
  user: { apiKeys?: { openai?: string; anthropic?: string; google?: string } },
  decryptFn: (enc: string) => string
): ProviderConfig[] {
  const order: Array<{ provider: "openai" | "anthropic" | "google"; model: string }> = [
    { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    { provider: "openai", model: "gpt-4o-mini" },
    { provider: "google", model: "gemini-1.5-flash" },
  ];
  const chain: ProviderConfig[] = [];
  const preferredKey = user.apiKeys?.[preferredProvider];
  if (preferredKey) chain.push({ provider: preferredProvider, model: preferredModel, apiKey: decryptFn(preferredKey).trim() });
  for (const fb of order) {
    if (fb.provider === preferredProvider) continue;
    const key = user.apiKeys?.[fb.provider];
    if (key) chain.push({ provider: fb.provider, model: fb.model, apiKey: decryptFn(key).trim() });
  }
  return chain;
}

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
      if (!agent || agent.status === "paused") {
        await ctx.runMutation(internal.heartbeats.setStatus, { agentId: args.agentId, status: "active" });
        return;
      }

      // Get user for API key
      const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
      if (!user) return;

      // Get pending tasks
      const tasks = await ctx.runQuery(api.tasks.getTasksByAgent, { agentId: args.agentId });
      const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "running");

      // Get recent messages
      const messages = await ctx.runQuery(api.messages.list, { agentId: args.agentId, clerkId: args.clerkId });
      const recentMessages = messages.slice(-5);

      // Load memory and soul from R2
      let soul = "";
      let memory = "";
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

      // Build system prompt (same enriched format as chatRunner)
      const baseIdentity = soul ? soul.slice(0, MAX_SOUL_CHARS) : agent.systemPrompt;
      let systemPrompt = baseIdentity;
      if (memory) {
        systemPrompt += `\n\n## Your Memory\n${memory.slice(0, MAX_MEMORY_CHARS)}`;
      }
      systemPrompt += `\n\n## Tools Available\nYou have access to tools including file management (read_file, write_file, list_files).\nUse write_file to update your MEMORY.md when you learn important things.`;

      // Build heartbeat user prompt
      const taskList = pendingTasks.length > 0
        ? pendingTasks.map((t) => `- [${t.status}] ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n")
        : "No pending tasks.";

      const msgList = recentMessages.length > 0
        ? recentMessages.map((m) => `[${m.role}] ${m.content.slice(0, 300)}`).join("\n")
        : "No recent messages.";

      const heartbeatPrompt = `You are running a scheduled heartbeat check. Current time: ${new Date().toISOString()}

## Pending Tasks
${taskList}

## Recent Messages
${msgList}

## What to do
- Check if any tasks need attention
- Update your MEMORY.md if you've learned anything important
- Do any proactive work that would help your user (web research, file updates, etc.)
- If nothing needs attention, just say "Nothing to report."

Be concise. Focus on action, not narration.`;

      // Build failover chain
      let preferredModel = agent.model || "claude-opus-4-6";
      let preferredProvider: "openai" | "anthropic" | "google";
      if (preferredModel.startsWith("claude")) preferredProvider = "anthropic";
      else if (preferredModel.startsWith("gemini")) preferredProvider = "google";
      else preferredProvider = "openai";

      const failoverChain = buildFailoverChain(preferredProvider, preferredModel, user, decrypt);

      if (failoverChain.length === 0) {
        await ctx.runMutation(api.heartbeats.recordHeartbeat, {
          agentId: args.agentId,
          lastResult: `No API key configured for any provider.`,
        });
        return;
      }

      // Get tools (same as chatRunner)
      const resolvedToolNames = agent.tools && agent.tools.length > 0
        ? getToolNamesFromSkills(agent.tools)
        : getAllToolNames();

      const tools = getEnabledTools(resolvedToolNames, {
        ctx,
        clerkId: args.clerkId,
        agentId: args.agentId,
        depth: 0,
      });

      const chatHistory: ChatMessage[] = [{ role: "user", content: heartbeatPrompt }];

      // Run with failover
      let result: LoopResult | null = null;
      let lastError: Error | null = null;
      for (const config of failoverChain) {
        try {
          if (config.provider === "openai") {
            result = await runOpenAILoop(config.apiKey, config.model, systemPrompt, chatHistory, tools);
          } else if (config.provider === "anthropic") {
            result = await runAnthropicLoop(config.apiKey, config.model, systemPrompt, chatHistory, tools);
          } else {
            result = await runGoogleLoop(config.apiKey, config.model, systemPrompt, chatHistory, tools);
          }
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[heartbeat failover] ${config.provider}/${config.model} failed: ${err.message?.slice(0, 150)}`);
          if (!isRetryableError(err)) break;
        }
      }

      if (!result) {
        throw lastError || new Error("All providers failed");
      }

      // Build result summary
      const toolSummary = result.toolCalls.length > 0
        ? `\n\nTools used: ${result.toolCalls.map(tc => tc.tool).join(", ")}`
        : "";
      const fullResult = result.text.slice(0, 2000) + toolSummary;

      // Record heartbeat result
      await ctx.runMutation(api.heartbeats.recordHeartbeat, {
        agentId: args.agentId,
        lastResult: fullResult,
      });

      // If agent did something noteworthy, save as system message in chat
      const isIdle = /nothing to report|all clear|standing by/i.test(result.text) && result.toolCalls.length === 0;
      if (!isIdle) {
        await ctx.runMutation(api.messages.addAgentMessage, {
          agentId: args.agentId,
          clerkId: args.clerkId,
          content: `💓 [Heartbeat] ${result.text.slice(0, 1000)}${result.text.length > 1000 ? "..." : ""}`,
          toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(api.heartbeats.recordHeartbeat, {
        agentId: args.agentId,
        lastResult: `Error: ${msg}`,
      });
    } finally {
      // Always reset status back to active
      await ctx.runMutation(internal.heartbeats.setStatus, { agentId: args.agentId, status: "active" });
    }
  },
});

// ─── Types ───

type ChatMessage = { role: "user" | "assistant"; content: string };
type ToolCallRecord = { tool: string; args?: string; result?: string };
type LoopResult = { text: string; toolCalls: ToolCallRecord[] };

// ─── Tool format helpers ───

function openAIToolDefs(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function anthropicToolDefs(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name, description: t.description, input_schema: t.parameters,
  }));
}

function googleToolDefs(tools: ToolDefinition[]) {
  return [{ functionDeclarations: tools.map((t) => ({
    name: t.name, description: t.description, parameters: t.parameters,
  })) }];
}

async function executeTool(name: string, args: any, tools: ToolDefinition[]): Promise<string> {
  return executeToolFromList(name, args, tools);
}

// ─── OpenAI Loop (non-streaming) ───

async function runOpenAILoop(
  apiKey: string, model: string, systemPrompt: string,
  history: ChatMessage[], tools: ToolDefinition[]
): Promise<LoopResult> {
  const msgs: any[] = [{ role: "system", content: systemPrompt }, ...history];
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? openAIToolDefs(tools) : undefined;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { model, messages: msgs, max_tokens: 1024 };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error("No response from OpenAI");

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { text: message.content || "(no response)", toolCalls };
    }

    msgs.push(message);
    for (const tc of message.tool_calls) {
      const fnArgs = JSON.parse(tc.function.arguments || "{}");
      const result = await executeTool(tc.function.name, fnArgs, tools);
      toolCalls.push({ tool: tc.function.name, args: JSON.stringify(fnArgs), result });
      msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }
  return { text: "(max tool iterations reached)", toolCalls };
}

// ─── Anthropic Loop (non-streaming) ───

async function runAnthropicLoop(
  apiKey: string, model: string, systemPrompt: string,
  history: ChatMessage[], tools: ToolDefinition[]
): Promise<LoopResult> {
  const msgs: any[] = history.map((m) => ({ role: m.role, content: m.content }));
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? anthropicToolDefs(tools) : undefined;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { model, system: systemPrompt, messages: msgs, max_tokens: 1024 };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey.includes("-oat")
          ? { "Authorization": `Bearer ${apiKey}` }
          : { "x-api-key": apiKey }),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();

    const toolUseBlocks = data.content?.filter((b: any) => b.type === "tool_use") || [];
    const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];

    if (toolUseBlocks.length === 0) {
      return { text: textBlocks[0]?.text || "(no response)", toolCalls };
    }

    msgs.push({ role: "assistant", content: data.content });

    const resultBlocks: any[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, tools);
      toolCalls.push({ tool: block.name, args: JSON.stringify(block.input), result });
      resultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
    msgs.push({ role: "user", content: resultBlocks });

    if (data.stop_reason === "end_turn") {
      return { text: textBlocks[0]?.text || "(no response)", toolCalls };
    }
  }
  return { text: "(max tool iterations reached)", toolCalls };
}

// ─── Google Loop (non-streaming) ───

async function runGoogleLoop(
  apiKey: string, model: string, systemPrompt: string,
  history: ChatMessage[], tools: ToolDefinition[]
): Promise<LoopResult> {
  const geminiModel = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const contents: any[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? googleToolDefs(tools) : undefined;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    const fnCalls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text);

    if (fnCalls.length === 0) {
      return { text: textParts[0]?.text || "(no response)", toolCalls };
    }

    contents.push({ role: "model", parts });
    const responseParts: any[] = [];
    for (const part of fnCalls) {
      const { name, args } = part.functionCall;
      const result = await executeTool(name, args, tools);
      toolCalls.push({ tool: name, args: JSON.stringify(args), result });
      responseParts.push({ functionResponse: { name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }
  return { text: "(max tool iterations reached)", toolCalls };
}
