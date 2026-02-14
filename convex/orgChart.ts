import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Get all org connections for a user (by Clerk ID)
export const getConnectionsByClerk = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("orgConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Save org connections — replaces all existing connections for the user
export const saveConnectionsByClerk = mutation({
  args: {
    clerkId: v.string(),
    connections: v.array(
      v.object({
        parentAgentId: v.id("agents"),
        childAgentId: v.id("agents"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    // Delete existing connections
    const existing = await ctx.db
      .query("orgConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const conn of existing) {
      await ctx.db.delete(conn._id);
    }

    // Insert new connections
    for (const conn of args.connections) {
      await ctx.db.insert("orgConnections", {
        userId: user._id,
        parentAgentId: conn.parentAgentId,
        childAgentId: conn.childAgentId,
      });
    }
  },
});

// Get node positions for a user
export const getPositionsByClerk = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("orgNodePositions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Save all node positions (replace all)
export const savePositionsByClerk = mutation({
  args: {
    clerkId: v.string(),
    positions: v.array(
      v.object({
        nodeKey: v.string(),
        x: v.number(),
        y: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");

    // Delete existing
    const existing = await ctx.db
      .query("orgNodePositions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const pos of existing) {
      await ctx.db.delete(pos._id);
    }

    // Insert new
    for (const pos of args.positions) {
      await ctx.db.insert("orgNodePositions", {
        userId: user._id,
        nodeKey: pos.nodeKey,
        x: pos.x,
        y: pos.y,
      });
    }
  },
});
