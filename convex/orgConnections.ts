import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orgConnections")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
    type: v.union(v.literal("reports_to"), v.literal("peers"), v.literal("cross_dept"), v.literal("broadcast")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orgConnections", args);
  },
});

export const remove = mutation({
  args: { id: v.id("orgConnections") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
