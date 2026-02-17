import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// ── Queries ──────────────────────────────────────────────────────────

export const getRunById = query({
  args: { runId: v.id("agentRuns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const getRunByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
  },
});

export const listRunsByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ── Internal Mutations (called from actions + agent runner) ──────────

export const createRun = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
    status: v.union(
      v.literal("queued"),
      v.literal("starting"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentRuns", args);
  },
});

export const updateRun = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, args.updates);
  },
});

export const reportProgress = mutation({
  args: {
    runId: v.id("agentRuns"),
    progressText: v.optional(v.string()),
    toolCall: v.optional(
      v.object({
        tool: v.string(),
        args: v.optional(v.string()),
        result: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const updates: Record<string, unknown> = {};
    if (args.progressText !== undefined) updates.progressText = args.progressText;
    if (args.inputTokens !== undefined) updates.inputTokens = args.inputTokens;
    if (args.outputTokens !== undefined) updates.outputTokens = args.outputTokens;

    if (args.toolCall) {
      const existing = run.toolCalls || [];
      updates.toolCalls = [...existing, args.toolCall];
    }

    await ctx.db.patch(args.runId, updates);
  },
});

export const completeRun = mutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    await ctx.db.patch(args.runId, {
      status: args.status,
      output: args.output,
      error: args.error,
      completedAt: Date.now(),
      ...(args.inputTokens !== undefined && { inputTokens: args.inputTokens }),
      ...(args.outputTokens !== undefined && { outputTokens: args.outputTokens }),
    });

    // Also update the task
    await ctx.db.patch(run.taskId, {
      status: args.status === "completed" ? "completed" : "failed",
      output: args.output || args.error || "",
      completedAt: Date.now(),
    });
  },
});

// ── Query for runner to fetch task details ───────────────────────────

export const getTaskForRunner = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;

    const agent = await ctx.db.get(task.agentId);
    if (!agent) return null;

    const user = await ctx.db.get(task.userId);
    if (!user) return null;

    const model = agent.model || "gpt-4o-mini";
    let provider: "openai" | "anthropic" | "google";
    if (model.startsWith("claude")) provider = "anthropic";
    else if (model.startsWith("gemini")) provider = "google";
    else provider = "openai";

    return {
      taskId: task._id,
      title: task.title,
      description: task.description,
      agentName: agent.name,
      agentRole: agent.role,
      systemPrompt: agent.systemPrompt,
      model,
      provider,
      encryptedApiKey: user.apiKeys?.[provider] || null,
    };
  },
});
