"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { decrypt } from "./crypto";
import { ToolDefinition } from "./tools/types";
import { getEnabledTools, executeToolFromList } from "./tools/index";
import { getToolNamesFromSkills, getAllToolNames } from "./tools/skillPacks";

const MAX_TOOL_ITERATIONS = 10;
const MAX_SOUL_CHARS = 2000;
const MAX_MEMORY_CHARS = 4000;

// ─── Provider Failover Config ───

type ProviderConfig = { provider: "openai" | "anthropic" | "google"; model: string; apiKey: string };

const PROVIDER_FALLBACK_ORDER: Array<{ provider: "openai" | "anthropic" | "google"; model: string }> = [
  { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  { provider: "openai", model: "gpt-4o-mini" },
  { provider: "google", model: "gemini-1.5-flash" },
];

const RETRYABLE_STATUS_CODES = new Set([401, 429, 500, 502, 503, 529]);

/**
 * Build an ordered list of provider configs to try, starting with the preferred one.
 * Falls back to other providers the user has keys for.
 */
function buildFailoverChain(
  preferredProvider: "openai" | "anthropic" | "google",
  preferredModel: string,
  user: { apiKeys?: { openai?: string; anthropic?: string; google?: string } },
  decryptFn: (enc: string) => string
): ProviderConfig[] {
  const chain: ProviderConfig[] = [];
  const preferredKey = user.apiKeys?.[preferredProvider];
  if (preferredKey) {
    chain.push({ provider: preferredProvider, model: preferredModel, apiKey: decryptFn(preferredKey).trim() });
  }
  for (const fb of PROVIDER_FALLBACK_ORDER) {
    if (fb.provider === preferredProvider) continue;
    const key = user.apiKeys?.[fb.provider];
    if (key) {
      chain.push({ provider: fb.provider, model: fb.model, apiKey: decryptFn(key).trim() });
    }
  }
  return chain;
}

/** Check if an error is retryable (HTTP status or timeout) */
function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    // Check for HTTP status codes in our error format "Provider NNN: ..."
    for (const code of RETRYABLE_STATUS_CODES) {
      if (msg.includes(` ${code}:`)) return true;
    }
    // Timeout / network errors
    if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(msg)) return true;
  }
  return false;
}

async function buildEnhancedSystemPrompt(
  ctx: any,
  clerkId: string,
  agentId: string,
  fallbackPrompt: string
): Promise<string> {
  let soulContent: string | null = null;
  let memoryContent: string | null = null;

  try {
    [soulContent, memoryContent] = await Promise.all([
      ctx.runAction(api.r2.readFile, {
        clerkId,
        key: `agents/${agentId}/SOUL.md`,
      }),
      ctx.runAction(api.r2.readFile, {
        clerkId,
        key: `agents/${agentId}/MEMORY.md`,
      }),
    ]);
  } catch {
    // R2 failure — fall back to plain system prompt
    return fallbackPrompt;
  }

  const soul = soulContent
    ? soulContent.slice(0, MAX_SOUL_CHARS)
    : fallbackPrompt;

  let prompt = soul;

  if (memoryContent) {
    prompt += `\n\n## Your Memory\n${memoryContent.slice(0, MAX_MEMORY_CHARS)}`;
  }

  prompt += `\n\n## Tools Available\nYou have access to tools including file management (read_file, write_file, list_files).\nUse write_file to update your MEMORY.md when you learn important things.`;

  return prompt;
}

export const respondToMessage = action({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
    telegramChatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent) throw new Error("Agent not found");

    const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
    if (!user) throw new Error("User not found");

    const messages = await ctx.runQuery(api.messages.list, {
      agentId: args.agentId,
      clerkId: args.clerkId,
    });

    // Build failover chain: preferred provider first, then alternatives
    let preferredModel = agent.model || "claude-opus-4-6";
    let preferredProvider: "openai" | "anthropic" | "google";
    if (preferredModel.startsWith("claude")) preferredProvider = "anthropic";
    else if (preferredModel.startsWith("gemini")) preferredProvider = "google";
    else preferredProvider = "openai";

    const failoverChain = buildFailoverChain(preferredProvider, preferredModel, user, decrypt);

    if (failoverChain.length === 0) {
      await ctx.runMutation(api.messages.addAgentMessage, {
        agentId: args.agentId,
        clerkId: args.clerkId,
        content: `⚠️ No API key configured. Go to Settings to add your OpenAI, Anthropic, or Google key.`,
      });
      return;
    }

    // Resolve skill pack keys → tool names (backward compat: no skills = all tools)
    const resolvedToolNames = agent.tools && agent.tools.length > 0
      ? getToolNamesFromSkills(agent.tools)
      : getAllToolNames();

    // Get enabled tools for this agent (depth=0 for user-initiated chats)
    // Pass pod info so shell_exec routes through the persistent machine
    const tools = getEnabledTools(resolvedToolNames, {
      ctx,
      clerkId: args.clerkId,
      agentId: args.agentId,
      depth: 0,
      podUrl: agent.podStatus === "running" ? agent.podUrl : undefined,
      podSecret: agent.podStatus === "running" ? agent.podSecret : undefined,
    });

    const chatHistory = messages.slice(-20).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    // Load agent memory from R2 for enriched system prompt
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(
      ctx, args.clerkId, args.agentId as string, agent.systemPrompt
    );

    // Create streaming message upfront
    const streamingMessageId = await ctx.runMutation(api.messages.createStreamingMessage, {
      agentId: args.agentId,
      clerkId: args.clerkId,
    });

    const streamCallback = createStreamCallback(ctx, streamingMessageId);

    let responseText: string = "";
    const collectedToolCalls: { tool: string; args?: string; result?: string }[] = [];
    let tokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    let usedProvider: "openai" | "anthropic" | "google" = failoverChain[0].provider;
    let usedModel: string = failoverChain[0].model;

    // Try each provider in the failover chain
    let lastError: Error | null = null;
    for (const config of failoverChain) {
      try {
        // Reset stream buffer for retry attempts
        streamCallback.reset();

        let result: LoopResult;
        if (config.provider === "openai") {
          result = await runOpenAIStreamingLoop(config.apiKey, config.model, enhancedSystemPrompt, chatHistory, tools, streamCallback);
        } else if (config.provider === "anthropic") {
          result = await runAnthropicStreamingLoop(config.apiKey, config.model, enhancedSystemPrompt, chatHistory, tools, streamCallback);
        } else {
          result = await runGoogleLoop(config.apiKey, config.model, enhancedSystemPrompt, chatHistory, tools);
          await ctx.runMutation(api.messages.appendToMessage, {
            messageId: streamingMessageId,
            text: result.text,
          });
        }

        responseText = result.text;
        collectedToolCalls.push(...result.toolCalls);
        tokenUsage = result.usage;
        usedProvider = config.provider;
        usedModel = config.model;
        lastError = null;
        break; // Success — stop trying
      } catch (err: any) {
        lastError = err;
        console.warn(`[failover] ${config.provider}/${config.model} failed: ${err.message?.slice(0, 150)}`);

        // Only retry if the error is retryable and there are more providers to try
        if (!isRetryableError(err)) {
          break; // Non-retryable error (e.g. bad request) — don't try other providers
        }
        // Continue to next provider in chain
      }
    }

    if (lastError) {
      responseText = `❌ Error: ${lastError.message || "Failed to generate response"}`;
      await ctx.runMutation(api.messages.appendToMessage, {
        messageId: streamingMessageId,
        text: responseText,
      });
    }

    // Flush any remaining buffered text
    await streamCallback.flush();

    await ctx.runMutation(api.messages.finalizeMessage, {
      messageId: streamingMessageId,
      toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
      inputTokens: tokenUsage.inputTokens || undefined,
      outputTokens: tokenUsage.outputTokens || undefined,
      model: usedModel,
      provider: usedProvider,
    });

    // If triggered from Telegram, send the response back
    if (args.telegramChatId && responseText && agent.telegramBotToken) {
      try {
        await ctx.runAction(api.telegramActions.sendTelegramMessage, {
          agentId: args.agentId,
          chatId: args.telegramChatId,
          text: responseText,
        });
      } catch (err: any) {
        console.error("[telegram] Failed to send reply:", err.message?.slice(0, 150));
      }
    }
  },
});

type ChatMessage = { role: "user" | "assistant"; content: string };
type ToolCallRecord = { tool: string; args?: string; result?: string };
type TokenUsage = { inputTokens: number; outputTokens: number };
type LoopResult = { text: string; toolCalls: ToolCallRecord[]; usage: TokenUsage };

// ─── Tool format helpers ───

function openAIToolDefs(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function anthropicToolDefs(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

function googleToolDefs(tools: ToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

async function executeTool(name: string, args: any, tools: ToolDefinition[]): Promise<string> {
  return executeToolFromList(name, args, tools);
}

// ─── Streaming helpers ───

type StreamCallback = {
  push: (text: string) => Promise<void>;
  flush: () => Promise<void>;
  reset: () => void;
};

function createStreamCallback(ctx: any, messageId: any): StreamCallback {
  let buffer = "";
  let lastFlush = Date.now();
  const FLUSH_INTERVAL = 250; // ms
  const FLUSH_SIZE = 40; // chars

  const flush = async () => {
    if (buffer.length > 0) {
      const text = buffer;
      buffer = "";
      lastFlush = Date.now();
      await ctx.runMutation(api.messages.appendToMessage, { messageId, text });
    }
  };

  return {
    push: async (text: string) => {
      buffer += text;
      if (buffer.length >= FLUSH_SIZE || Date.now() - lastFlush >= FLUSH_INTERVAL) {
        await flush();
      }
    },
    flush,
    reset: () => { buffer = ""; lastFlush = Date.now(); },
  };
}

// ─── Anthropic Streaming Loop ───

async function runAnthropicStreamingLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  tools: ToolDefinition[],
  stream: StreamCallback
): Promise<LoopResult> {
  const msgs: any[] = history.map((m) => ({ role: m.role, content: m.content }));
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? anthropicToolDefs(tools) : undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { model, system: systemPrompt, messages: msgs, max_tokens: 1024, stream: true };
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
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
    }

    // Parse SSE stream
    let fullText = "";
    const toolUseBlocks: any[] = [];
    let currentToolUse: any = null;
    let stopReason = "";

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });

      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        let event: any;
        try { event = JSON.parse(data); } catch { continue; }

        switch (event.type) {
          case "message_start":
            if (event.message?.usage) {
              totalInputTokens += event.message.usage.input_tokens || 0;
            }
            break;
          case "content_block_start":
            if (event.content_block?.type === "tool_use") {
              currentToolUse = { id: event.content_block.id, name: event.content_block.name, inputJson: "" };
            }
            break;
          case "content_block_delta":
            if (event.delta?.type === "text_delta") {
              fullText += event.delta.text;
              await stream.push(event.delta.text);
            } else if (event.delta?.type === "input_json_delta" && currentToolUse) {
              currentToolUse.inputJson += event.delta.partial_json;
            }
            break;
          case "content_block_stop":
            if (currentToolUse) {
              toolUseBlocks.push(currentToolUse);
              currentToolUse = null;
            }
            break;
          case "message_delta":
            if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
            if (event.usage?.output_tokens) totalOutputTokens += event.usage.output_tokens;
            break;
        }
      }
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0) {
      return { text: fullText || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
    }

    // Build assistant content blocks for conversation history
    const assistantContent: any[] = [];
    if (fullText) assistantContent.push({ type: "text", text: fullText });
    for (const tu of toolUseBlocks) {
      let input = {};
      try { input = JSON.parse(tu.inputJson || "{}"); } catch {}
      assistantContent.push({ type: "tool_use", id: tu.id, name: tu.name, input });
    }
    msgs.push({ role: "assistant", content: assistantContent });

    // Execute tools
    const resultBlocks: any[] = [];
    for (const tu of toolUseBlocks) {
      let input = {};
      try { input = JSON.parse(tu.inputJson || "{}"); } catch {}
      const result = await executeTool(tu.name, input, tools);
      toolCalls.push({ tool: tu.name, args: tu.inputJson, result });
      resultBlocks.push({ type: "tool_result", tool_use_id: tu.id, content: result });
    }
    msgs.push({ role: "user", content: resultBlocks });

    // Flush before next iteration and reset for new streaming content
    await stream.flush();

    if (stopReason === "end_turn") {
      return { text: fullText || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
    }
  }

  return { text: "(max tool iterations reached)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
}

// ─── OpenAI Streaming Loop ───

async function runOpenAIStreamingLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  tools: ToolDefinition[],
  stream: StreamCallback
): Promise<LoopResult> {
  const msgs: any[] = [{ role: "system", content: systemPrompt }, ...history];
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? openAIToolDefs(tools) : undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { model, messages: msgs, max_tokens: 1024, stream: true, stream_options: { include_usage: true } };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
    }

    let fullText = "";
    const pendingToolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });

      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        let event: any;
        try { event = JSON.parse(data); } catch { continue; }

        // Extract usage from final chunk
        if (event.usage) {
          totalInputTokens += event.usage.prompt_tokens || 0;
          totalOutputTokens += event.usage.completion_tokens || 0;
        }

        const delta = event.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          fullText += delta.content;
          await stream.push(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!pendingToolCalls.has(idx)) {
              pendingToolCalls.set(idx, { id: tc.id || "", name: tc.function?.name || "", args: "" });
            }
            const existing = pendingToolCalls.get(idx)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.args += tc.function.arguments;
          }
        }
      }
    }

    // If no tool calls, return
    if (pendingToolCalls.size === 0) {
      return { text: fullText || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
    }

    // Build assistant message with tool calls for history
    const assistantMsg: any = { role: "assistant", content: fullText || null, tool_calls: [] };
    for (const [, tc] of pendingToolCalls) {
      assistantMsg.tool_calls.push({ id: tc.id, type: "function", function: { name: tc.name, arguments: tc.args } });
    }
    msgs.push(assistantMsg);

    // Execute tools
    for (const [, tc] of pendingToolCalls) {
      const fnArgs = JSON.parse(tc.args || "{}");
      const result = await executeTool(tc.name, fnArgs, tools);
      toolCalls.push({ tool: tc.name, args: tc.args, result });
      msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
    }

    await stream.flush();
  }

  return { text: "(max tool iterations reached)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
}

// ─── OpenAI Loop (non-streaming, kept for agent-to-agent) ───

async function runOpenAILoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  tools: ToolDefinition[]
): Promise<LoopResult> {
  const msgs: any[] = [{ role: "system", content: systemPrompt }, ...history];
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? openAIToolDefs(tools) : undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { model, messages: msgs, max_tokens: 1024 };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    if (data.usage) {
      totalInputTokens += data.usage.prompt_tokens || 0;
      totalOutputTokens += data.usage.completion_tokens || 0;
    }
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) throw new Error("No response from OpenAI");

    // If no tool calls, return text
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { text: message.content || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
    }

    // Add assistant message with tool calls
    msgs.push(message);

    // Execute each tool call
    for (const tc of message.tool_calls) {
      const fnName = tc.function.name;
      const fnArgs = JSON.parse(tc.function.arguments || "{}");
      const result = await executeTool(fnName, fnArgs, tools);

      toolCalls.push({ tool: fnName, args: JSON.stringify(fnArgs), result });
      msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  return { text: "(max tool iterations reached)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
}

// ─── Anthropic Loop ───

async function runAnthropicLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  tools: ToolDefinition[]
): Promise<LoopResult> {
  const msgs: any[] = history.map((m) => ({ role: m.role, content: m.content }));
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? anthropicToolDefs(tools) : undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    if (data.usage) {
      totalInputTokens += data.usage.input_tokens || 0;
      totalOutputTokens += data.usage.output_tokens || 0;
    }

    const toolUseBlocks = data.content?.filter((b: any) => b.type === "tool_use") || [];
    const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];

    if (toolUseBlocks.length === 0) {
      return { text: textBlocks[0]?.text || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
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
      return { text: textBlocks[0]?.text || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
    }
  }

  return { text: "(max tool iterations reached)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
}

// ─── Google Loop ───

async function runGoogleLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  tools: ToolDefinition[]
): Promise<LoopResult> {
  const geminiModel = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const contents: any[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const toolCalls: ToolCallRecord[] = [];
  const toolsDef = tools.length > 0 ? googleToolDefs(tools) : undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    if (data.usageMetadata) {
      totalInputTokens += data.usageMetadata.promptTokenCount || 0;
      totalOutputTokens += data.usageMetadata.candidatesTokenCount || 0;
    }
    const parts = data.candidates?.[0]?.content?.parts || [];

    const fnCalls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text);

    if (fnCalls.length === 0) {
      return { text: textParts[0]?.text || "(no response)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
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

  return { text: "(max tool iterations reached)", toolCalls, usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens } };
}

// ─── Agent-to-Agent Chat ───

export const agentToAgentChat = action({
  args: {
    callingAgentId: v.id("agents"),
    targetAgentId: v.id("agents"),
    clerkId: v.string(),
    message: v.string(),
    depth: v.number(),
  },
  handler: async (ctx, args): Promise<string> => {
    if (args.depth > 3) {
      return "Error: Maximum agent-to-agent depth exceeded.";
    }

    const targetAgent = await ctx.runQuery(api.agents.getAgent, { agentId: args.targetAgentId });
    if (!targetAgent) return "Error: Target agent not found.";

    const callingAgent = await ctx.runQuery(api.agents.getAgent, { agentId: args.callingAgentId });
    if (!callingAgent) return "Error: Calling agent not found.";

    if (targetAgent.userId !== callingAgent.userId) {
      return "Error: Agents must belong to the same user.";
    }

    const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
    if (!user) return "Error: User not found.";

    const model = targetAgent.model || "claude-opus-4-6";
    let provider: "openai" | "anthropic" | "google";
    if (model.startsWith("claude")) provider = "anthropic";
    else if (model.startsWith("gemini")) provider = "google";
    else provider = "openai";

    const encryptedKey = user.apiKeys?.[provider];
    if (!encryptedKey) {
      return `Error: No ${provider} API key configured for agent-to-agent chat.`;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) return "Error: ENCRYPTION_KEY not set.";

    const { decrypt } = await import("./crypto");
    const apiKey = decrypt(encryptedKey, encryptionKey);

    const resolvedToolNames = targetAgent.tools && targetAgent.tools.length > 0
      ? getToolNamesFromSkills(targetAgent.tools)
      : getAllToolNames();

    const tools = getEnabledTools(resolvedToolNames, {
      ctx,
      clerkId: args.clerkId,
      agentId: args.targetAgentId,
      depth: args.depth,
      podUrl: targetAgent.podStatus === "running" ? targetAgent.podUrl : undefined,
      podSecret: targetAgent.podStatus === "running" ? targetAgent.podSecret : undefined,
    });

    const basePrompt = await buildEnhancedSystemPrompt(
      ctx, args.clerkId, args.targetAgentId as string, targetAgent.systemPrompt
    );
    const systemPrompt = basePrompt +
      `\n\n[This message was sent by agent "${callingAgent.name}" (${callingAgent.role}). Respond helpfully to their request.]`;

    const chatHistory: ChatMessage[] = [
      { role: "user", content: args.message },
    ];

    let result: LoopResult;
    if (provider === "openai") {
      result = await runOpenAILoop(apiKey, model, systemPrompt, chatHistory, tools);
    } else if (provider === "anthropic") {
      result = await runAnthropicLoop(apiKey, model, systemPrompt, chatHistory, tools);
    } else {
      result = await runGoogleLoop(apiKey, model, systemPrompt, chatHistory, tools);
    }

    // Log the inter-agent exchange
    await ctx.runMutation(api.messages.addAgentMessage, {
      agentId: args.targetAgentId,
      clerkId: args.clerkId,
      content: `🤖 [Agent-to-agent] "${callingAgent.name}" asked: ${args.message.slice(0, 200)}${args.message.length > 200 ? "..." : ""}\n\nResponse: ${result.text.slice(0, 500)}${result.text.length > 500 ? "..." : ""}`,
      toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
    });

    return result.text;
  },
});
