import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();
  },
});

export const listByStatus = query({
  args: { companyId: v.id("companies"), status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_company_status", (q) =>
        q.eq("companyId", args.companyId).eq("status", args.status as any)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    title: v.string(),
    description: v.string(),
    assignedTo: v.id("agents"),
    assignedBy: v.optional(v.id("agents")),
    assignedByFounder: v.optional(v.boolean()),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("needs_approval"),
      v.literal("completed"),
      v.literal("failed")
    )),
    output: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    const clean: any = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (clean.status === "completed") clean.completedAt = Date.now();
    await ctx.db.patch(id, clean);
  },
});
