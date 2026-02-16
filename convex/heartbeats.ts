import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";

// --- Queries ---

export const getByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("heartbeats")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
  },
});

export const listByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const heartbeats = await Promise.all(
      agents.map(async (agent) => {
        const hb = await ctx.db
          .query("heartbeats")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .first();
        return hb ? { ...hb, agentName: agent.name, agentIcon: agent.icon } : null;
      })
    );
    return heartbeats.filter(Boolean);
  },
});

// Internal query for cron to get all active heartbeats
export const listActive = internalQuery({
  handler: async (ctx) => {
    const all = await ctx.db.query("heartbeats").collect();
    return all.filter((hb) => hb.status === "active");
  },
});

// --- Mutations ---

export const recordHeartbeat = mutation({
  args: {
    agentId: v.id("agents"),
    lastResult: v.string(),
  },
  handler: async (ctx, args) => {
    const hb = await ctx.db
      .query("heartbeats")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!hb) return;
    await ctx.db.patch(hb._id, {
      lastRun: Date.now(),
      lastResult: args.lastResult,
      status: "active",
      runCount: hb.runCount + 1,
    });
  },
});

export const togglePause = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const hb = await ctx.db
      .query("heartbeats")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!hb) return;
    await ctx.db.patch(hb._id, {
      status: hb.status === "paused" ? "active" : "paused",
    });
  },
});

export const setStatus = internalMutation({
  args: { agentId: v.id("agents"), status: v.string() },
  handler: async (ctx, args) => {
    const hb = await ctx.db
      .query("heartbeats")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!hb) return;
    await ctx.db.patch(hb._id, { status: args.status });
  },
});

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("heartbeats", {
      agentId: args.agentId,
      clerkId: args.clerkId,
      status: "active",
      runCount: 0,
    });
  },
});

export const deleteByAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const hb = await ctx.db
      .query("heartbeats")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (hb) await ctx.db.delete(hb._id);
  },
});
