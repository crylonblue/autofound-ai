import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Log an activity event
export const log = internalMutation({
  args: {
    userId: v.id("users"),
    agentId: v.id("agents"),
    type: v.union(
      v.literal("heartbeat_complete"),
      v.literal("task_complete"),
      v.literal("task_failed"),
      v.literal("chat_response"),
      v.literal("proactive_action"),
      v.literal("error")
    ),
    summary: v.string(),
    metadata: v.optional(v.object({
      taskId: v.optional(v.string()),
      messageId: v.optional(v.string()),
      error: v.optional(v.string()),
      tokensUsed: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activities", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Public mutation for logging from actions
export const logActivity = mutation({
  args: {
    clerkId: v.string(),
    agentId: v.id("agents"),
    type: v.union(
      v.literal("heartbeat_complete"),
      v.literal("task_complete"),
      v.literal("task_failed"),
      v.literal("chat_response"),
      v.literal("proactive_action"),
      v.literal("error")
    ),
    summary: v.string(),
    metadata: v.optional(v.object({
      taskId: v.optional(v.string()),
      messageId: v.optional(v.string()),
      error: v.optional(v.string()),
      tokensUsed: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    await ctx.db.insert("activities", {
      userId: user._id,
      agentId: args.agentId,
      type: args.type,
      summary: args.summary,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// List recent activities for a user (with agent info)
export const listByClerk = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];

    const limit = args.limit ?? 50;

    let activities;
    if (args.agentId) {
      activities = await ctx.db
        .query("activities")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId!))
        .order("desc")
        .take(limit);
    } else {
      activities = await ctx.db
        .query("activities")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit);
    }

    // Enrich with agent info
    const agentIds = [...new Set(activities.map((a) => a.agentId))];
    const agents = await Promise.all(agentIds.map((id) => ctx.db.get(id)));
    const agentMap = new Map(agents.filter(Boolean).map((a) => [a!._id, a!]));

    return activities.map((activity) => {
      const agent = agentMap.get(activity.agentId);
      return {
        ...activity,
        agentName: agent?.name ?? "Unknown",
        agentIcon: agent?.icon ?? "🤖",
        agentColor: agent?.color ?? "#3B82F6",
      };
    });
  },
});
