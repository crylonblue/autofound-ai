"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { decrypt } from "./crypto";

// Execute a task: get agent prompt + user key, call LLM, save output
export const executeTask = action({
  args: {
    taskId: v.id("tasks"),
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; output: string }> => {
    // Get task
    const task = await ctx.runQuery(api.tasks.getTask, { taskId: args.taskId });
    if (!task) throw new Error("Task not found");

    // Get agent
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: task.agentId });
    if (!agent) throw new Error("Agent not found");

    // Get user to determine model/provider
    const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
    if (!user) throw new Error("User not found");

    // Mark as running
    await ctx.runMutation(internal.tasks.internalUpdateTask, {
      taskId: args.taskId,
      status: "running",
    });

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
      await ctx.runMutation(internal.tasks.internalUpdateTask, {
        taskId: args.taskId,
        status: "failed",
        output: `No ${provider} API key configured. Go to Settings → API Keys to add one.`,
      });
      return { success: false, output: "Missing API key" };
    }

    const apiKey = decrypt(encryptedKey);

    try {
      let output: string;

      if (provider === "openai") {
        output = await callOpenAI(apiKey, model, agent.systemPrompt, task.title, task.description);
      } else if (provider === "anthropic") {
        output = await callAnthropic(apiKey, model, agent.systemPrompt, task.title, task.description);
      } else {
        output = await callGoogle(apiKey, model, agent.systemPrompt, task.title, task.description);
      }

      await ctx.runMutation(internal.tasks.internalUpdateTask, {
        taskId: args.taskId,
        status: "completed",
        output,
      });

      // Log activity
      await ctx.runMutation(internal.activities.log, {
        userId: user._id,
        agentId: task.agentId,
        type: "task_complete",
        summary: `Completed: ${task.title}`,
        metadata: { taskId: args.taskId },
      });

      return { success: true, output };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.tasks.internalUpdateTask, {
        taskId: args.taskId,
        status: "failed",
        output: `Error: ${msg}`,
      });

      // Log failure
      await ctx.runMutation(internal.activities.log, {
        userId: user._id,
        agentId: task.agentId,
        type: "task_failed",
        summary: `Failed: ${task.title}`,
        metadata: { taskId: args.taskId, error: msg.slice(0, 200) },
      });

      return { success: false, output: msg };
    }
  },
});

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, title: string, description?: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Task: ${title}${description ? `\n\nDetails: ${description}` : ""}` },
      ],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, title: string, description?: string) {
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
      messages: [
        { role: "user", content: `Task: ${title}${description ? `\n\nDetails: ${description}` : ""}` },
      ],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callGoogle(apiKey: string, model: string, systemPrompt: string, title: string, description?: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: `Task: ${title}${description ? `\n\nDetails: ${description}` : ""}` }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Google API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
