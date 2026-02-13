import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const getTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const listTasks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getTasksByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

export const createTask = mutation({
  args: {
    userId: v.id("users"),
    agentId: v.id("agents"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Get tasks with agent info joined
export const listTasksWithAgents = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const agentIds = [...new Set(tasks.map((t) => t.agentId))];
    const agents = await Promise.all(agentIds.map((id) => ctx.db.get(id)));
    const agentMap = new Map(agents.filter(Boolean).map((a) => [a!._id, a!]));
    return tasks.map((t) => {
      const agent = agentMap.get(t.agentId);
      return {
        ...t,
        agentName: agent?.name ?? "Unknown",
        agentIcon: agent?.icon ?? "🤖",
        agentRole: agent?.role ?? "",
      };
    });
  },
});

// Create task by clerkId (resolves user internally)
export const createTaskByClerk = mutation({
  args: {
    clerkId: v.string(),
    agentId: v.id("agents"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    return await ctx.db.insert("tasks", {
      userId: user._id,
      agentId: args.agentId,
      title: args.title,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Internal: update task (called from execution action)
export const internalUpdateTask = internalMutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("needs_approval"), v.literal("completed"), v.literal("failed")),
    output: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.output !== undefined) updates.output = args.output;
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.taskId, updates);
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("needs_approval"), v.literal("completed"), v.literal("failed")),
    output: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.output !== undefined) updates.output = args.output;
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.taskId, updates);
  },
});
