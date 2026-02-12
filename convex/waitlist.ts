import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const join = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    // Check if already on waitlist
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      return { status: "already_joined" as const };
    }
    await ctx.db.insert("waitlist", {
      email,
      source: args.source,
      createdAt: Date.now(),
    });
    return { status: "joined" as const };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("waitlist").collect();
    return all.length;
  },
});
