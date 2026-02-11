import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { companyId: v.id("companies"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("messages")
      .withIndex("by_company_time", (q) => q.eq("companyId", args.companyId))
      .order("desc");
    return args.limit ? await q.take(args.limit) : await q.collect();
  },
});

export const send = mutation({
  args: {
    companyId: v.id("companies"),
    fromAgentId: v.optional(v.id("agents")),
    fromFounder: v.optional(v.boolean()),
    toAgentId: v.optional(v.id("agents")),
    toFounder: v.optional(v.boolean()),
    content: v.string(),
    type: v.union(v.literal("task"), v.literal("report"), v.literal("question"), v.literal("escalation"), v.literal("info")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
