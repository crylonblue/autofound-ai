import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    templateId: v.optional(v.string()),
    name: v.string(),
    role: v.string(),
    department: v.string(),
    avatar: v.optional(v.string()),
    systemPrompt: v.string(),
    model: v.string(),
    tools: v.array(v.string()),
    managerId: v.optional(v.id("agents")),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      ...args,
      status: "active",
      stats: {
        tasksCompleted: 0,
        messagesHandled: 0,
        tokensUsed: 0,
        lastActive: Date.now(),
      },
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    managerId: v.optional(v.id("agents")),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("terminated"))),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    // Remove connections
    const connsFrom = await ctx.db.query("orgConnections").withIndex("by_from", q => q.eq("fromAgentId", args.id)).collect();
    const connsTo = await ctx.db.query("orgConnections").withIndex("by_to", q => q.eq("toAgentId", args.id)).collect();
    for (const c of [...connsFrom, ...connsTo]) {
      await ctx.db.delete(c._id);
    }
    // Remove agent subordinates' managerId
    const reports = await ctx.db.query("agents").withIndex("by_manager", q => q.eq("managerId", args.id)).collect();
    for (const r of reports) {
      await ctx.db.patch(r._id, { managerId: undefined });
    }
    await ctx.db.delete(args.id);
  },
});
