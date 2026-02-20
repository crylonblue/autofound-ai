import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const getAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

export const listAgentsByClerk = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listAgents = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const createAgentByClerk = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    role: v.string(),
    icon: v.string(),
    color: v.string(),
    systemPrompt: v.string(),
    model: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) {
      // Auto-create user if UserSync hasn't fired yet
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: "",
        createdAt: Date.now(),
      });
      user = (await ctx.db.get(userId))!;
    }
    const { clerkId: _, ...rest } = args;
    const agentId = await ctx.db.insert("agents", {
      ...rest,
      userId: user._id,
      createdAt: Date.now(),
    });
    // Initialize R2 memory files for the new agent
    await ctx.scheduler.runAfter(0, api.r2.initAgentFiles, {
      clerkId: args.clerkId,
      agentId: agentId,
      agentName: args.name,
      systemPrompt: args.systemPrompt,
    });
    // Create heartbeat record
    await ctx.db.insert("heartbeats", {
      agentId,
      clerkId: args.clerkId,
      status: "active",
      runCount: 0,
    });
    // Provision a persistent Fly Machine pod for this agent
    await ctx.scheduler.runAfter(0, api.podManager.provisionPod, { agentId });
    return agentId;
  },
});

export const createAgent = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    icon: v.string(),
    color: v.string(),
    systemPrompt: v.string(),
    model: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    reportsTo: v.optional(v.id("agents")),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateAgent = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    reportsTo: v.optional(v.id("agents")),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("draft"))),
  },
  handler: async (ctx, args) => {
    const { agentId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    // Handle pod lifecycle on status change
    if (args.status) {
      const agent = await ctx.db.get(agentId);
      if (agent?.machineId) {
        if (args.status === "paused" && agent.status !== "paused") {
          await ctx.scheduler.runAfter(0, api.podManager.stopPod, { agentId });
        } else if (args.status === "active" && agent.status === "paused") {
          await ctx.scheduler.runAfter(0, api.podManager.startPod, { agentId });
        }
      }
    }
    await ctx.db.patch(agentId, filtered);
  },
});

export const deleteAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    // Delete heartbeat record
    const hb = await ctx.db
      .query("heartbeats")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (hb) await ctx.db.delete(hb._id);
    // Destroy the agent's Fly Machine pod
    await ctx.scheduler.runAfter(0, api.podManager.destroyPod, { agentId: args.agentId });
    // Clean up R2 files for this agent
    if (agent) {
      const user = await ctx.db.get(agent.userId);
      if (user?.clerkId) {
        await ctx.scheduler.runAfter(0, api.r2.deletePrefix, {
          clerkId: user.clerkId,
          prefix: `agents/${args.agentId}`,
        });
      }
    }
    await ctx.db.delete(args.agentId);
  },
});
