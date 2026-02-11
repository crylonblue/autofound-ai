import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("companies", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      status: "active",
      settings: {
        defaultModel: "claude-sonnet-4-20250514",
        approvalMode: "external",
        timezone: "UTC",
      },
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("archived"))),
    settings: v.optional(v.object({
      defaultModel: v.string(),
      approvalMode: v.union(v.literal("all"), v.literal("external"), v.literal("none")),
      timezone: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, clean);
  },
});
