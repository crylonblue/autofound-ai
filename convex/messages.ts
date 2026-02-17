import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const list = query({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_agent_and_user", (q) =>
        q.eq("agentId", args.agentId).eq("clerkId", args.clerkId)
      )
      .order("desc")
      .take(100)
      .then((msgs) => msgs.reverse());
  },
});

export const send = mutation({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      agentId: args.agentId,
      clerkId: args.clerkId,
      role: "user",
      content: args.content,
      timestamp: Date.now(),
    });
    // Trigger agent response
    await ctx.scheduler.runAfter(0, api.chatRunner.respondToMessage, {
      agentId: args.agentId,
      clerkId: args.clerkId,
    });
    return messageId;
  },
});

export const addAgentMessage = mutation({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
    content: v.string(),
    toolCalls: v.optional(v.array(v.object({
      tool: v.string(),
      args: v.optional(v.string()),
      result: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      agentId: args.agentId,
      clerkId: args.clerkId,
      role: "agent",
      content: args.content,
      timestamp: Date.now(),
      toolCalls: args.toolCalls,
    });
  },
});

export const clearHistory = mutation({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_agent_and_user", (q) =>
        q.eq("agentId", args.agentId).eq("clerkId", args.clerkId)
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});
