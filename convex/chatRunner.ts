"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { decrypt } from "./crypto";
import { ToolDefinition } from "./tools/types";
import { getEnabledTools, executeToolFromList } from "./tools/index";
import { getToolNamesFromSkills, getAllToolNames } from "./tools/skillPacks";

const MAX_TOOL_ITERATIONS = 10;

export const respondToMessage = action({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
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

    // Determine provider from agent model, with fallback to any available key
    let model = agent.model || "claude-opus-4-6";
    let provider: "openai" | "anthropic" | "google";
    if (model.startsWith("claude")) provider = "anthropic";
    else if (model.startsWith("gemini")) provider = "google";
    else provider = "openai";

    let encryptedKey = user.apiKeys?.[provider];

    // If preferred provider key is missing, try to fall back to any available key
    if (!encryptedKey) {
      const fallbacks: Array<{ p: "openai" | "anthropic" | "google"; m: string }> = [
        { p: "anthropic", m: "claude-opus-4-6" },
        { p: "openai", m: "gpt-4o-mini" },
        { p: "google", m: "gemini-1.5-flash" },
      ];
      for (const fb of fallbacks) {
        if (fb.p !== provider && user.apiKeys?.[fb.p]) {
          provider = fb.p;
          model = fb.m;
          encryptedKey = user.apiKeys[fb.p];
          break;
        }
      }
    }

    if (!encryptedKey) {
      await ctx.runMutation(api.messages.addAgentMessage, {
        agentId: args.agentId,
        clerkId: args.clerkId,
        content: `⚠️ No API key configured. Go to Settings to add your OpenAI, Anthropic, or Google key.`,
      });
      return;
    }

    const apiKey = decrypt(encryptedKey).trim();

    // Resolve skill pack keys → tool names (backward compat: no skills = all tools)
    const resolvedToolNames = agent.tools && agent.tools.length > 0
      ? getToolNamesFromSkills(agent.tools)
      : getAllToolNames();

    // Get enabled tools for this agent (depth=0 for user-initiated chats)
    const tools = getEnabledTools(resolvedToolNames, {
      ctx,
      clerkId: args.clerkId,
      agentId: args.agentId,
      depth: 0,
    });

    const chatHistory = messages.slice(-20).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    let responseText: string;
    const collectedToolCalls: { tool: string; args?: string; result?: string }[] = [];

    try {
      if (provider === "openai") {
        const result = await runOpenAILoop(apiKey, model, agent.systemPrompt, chatHistory, tools);
        responseText = result.text;
        collectedToolCalls.push(...result.toolCalls);
      } else if (provider === "anthropic") {
        const result = await runAnthropicLoop(apiKey, model, agent.systemPrompt, chatHistory, tools);
        responseText = result.text;
        collectedToolCalls.push(...result.toolCalls);
      } else {
        const result = await runGoogleLoop(apiKey, model, agent.systemPrompt, chatHistory, tools);
        responseText = result.text;
        collectedToolCalls.push(...result.toolCalls);
      }
    } catch (err: any) {
      responseText = `❌ Error: ${err.message || "Failed to generate response"}`;
    }

    await ctx.runMutation(api.messages.addAgentMessage, {
      agentId: args.agentId,
      clerkId: args.clerkId,
      content: responseText,
      toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
    });
  },
});

type ChatMessage = { role: "user" | "assistant"; content: string };
type ToolCallRecord = { tool: string; args?: string; result?: string };
type LoopResult = { text: string; toolCalls: ToolCallRecord[] };

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

// ─── OpenAI Loop ───

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
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) throw new Error("No response from OpenAI");

    // If no tool calls, return text
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { text: message.content || "(no response)", toolCalls };
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

  return { text: "(max tool iterations reached)", toolCalls };
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

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const body: any = { model, system: systemPrompt, messages: msgs, max_tokens: 1024 };
    if (toolsDef) body.tools = toolsDef;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Support both regular API keys (x-api-key) and OAuth tokens (Authorization: Bearer)
        // OAuth tokens contain "oat" in the prefix (sk-ant-oat...)
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

    // Check for tool_use blocks
    const toolUseBlocks = data.content?.filter((b: any) => b.type === "tool_use") || [];
    const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];

    if (toolUseBlocks.length === 0) {
      return { text: textBlocks[0]?.text || "(no response)", toolCalls };
    }

    // Add assistant message
    msgs.push({ role: "assistant", content: data.content });

    // Execute tools and build tool_result blocks
    const resultBlocks: any[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input, tools);
      toolCalls.push({ tool: block.name, args: JSON.stringify(block.input), result });
      resultBlocks.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }
    msgs.push({ role: "user", content: resultBlocks });

    // If stop_reason is end_turn (not tool_use), we're done
    if (data.stop_reason === "end_turn") {
      return { text: textBlocks[0]?.text || "(no response)", toolCalls };
    }
  }

  return { text: "(max tool iterations reached)", toolCalls };
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
    const parts = data.candidates?.[0]?.content?.parts || [];

    const fnCalls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text);

    if (fnCalls.length === 0) {
      return { text: textParts[0]?.text || "(no response)", toolCalls };
    }

    // Add model response
    contents.push({ role: "model", parts });

    // Execute and respond
    const responseParts: any[] = [];
    for (const part of fnCalls) {
      const { name, args } = part.functionCall;
      const result = await executeTool(name, args, tools);
      toolCalls.push({ tool: name, args: JSON.stringify(args), result });
      responseParts.push({
        functionResponse: { name, response: { result } },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { text: "(max tool iterations reached)", toolCalls };
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
    });

    const systemPrompt = targetAgent.systemPrompt +
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
