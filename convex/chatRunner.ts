"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { decrypt } from "./crypto";

/**
 * Chat runner: when a user sends a message, this action:
 * 1. Loads conversation history
 * 2. Gets agent config + user's API key
 * 3. Calls the LLM
 * 4. Saves the agent response
 */
export const respondToMessage = action({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get agent
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent) throw new Error("Agent not found");

    // Get user for API keys
    const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
    if (!user) throw new Error("User not found");

    // Get conversation history
    const messages = await ctx.runQuery(api.messages.list, {
      agentId: args.agentId,
      clerkId: args.clerkId,
    });

    // Determine provider from agent model
    const model = agent.model || "gpt-4o-mini";
    let provider: "openai" | "anthropic" | "google";
    if (model.startsWith("claude")) provider = "anthropic";
    else if (model.startsWith("gemini")) provider = "google";
    else provider = "openai";

    // Get decrypted key
    const encryptedKey = user.apiKeys?.[provider];
    if (!encryptedKey) {
      await ctx.runMutation(api.messages.addAgentMessage, {
        agentId: args.agentId,
        clerkId: args.clerkId,
        content: `⚠️ No ${provider} API key configured. Go to Settings to add your key.`,
      });
      return;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");
    const apiKey = decrypt(encryptedKey, encryptionKey);

    // Build message history for the LLM
    const chatHistory = messages.slice(-20).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    let responseText: string;

    try {
      if (provider === "anthropic") {
        responseText = await callAnthropic(apiKey, model, agent.systemPrompt, chatHistory);
      } else if (provider === "google") {
        responseText = await callGoogle(apiKey, model, agent.systemPrompt, chatHistory);
      } else {
        responseText = await callOpenAI(apiKey, model, agent.systemPrompt, chatHistory);
      }
    } catch (err: any) {
      responseText = `❌ Error: ${err.message || "Failed to generate response"}`;
    }

    // Save agent response
    await ctx.runMutation(api.messages.addAgentMessage, {
      agentId: args.agentId,
      clerkId: args.clerkId,
      content: responseText,
    });
  },
});

type ChatMessage = { role: "user" | "assistant"; content: string };

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "(no response)";
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "(no response)";
}

async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const geminiModel = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "(no response)";
}
