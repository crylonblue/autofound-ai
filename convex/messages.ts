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
    source: v.optional(v.union(v.literal("web"), v.literal("telegram"))),
    telegramChatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      agentId: args.agentId,
      clerkId: args.clerkId,
      role: "user",
      content: args.content,
      timestamp: Date.now(),
      source: args.source,
    });
    // Trigger agent response (pass telegramChatId so chatRunner can reply directly)
    await ctx.scheduler.runAfter(0, api.chatRunner.respondToMessage, {
      agentId: args.agentId,
      clerkId: args.clerkId,
      telegramChatId: args.telegramChatId,
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

export const createStreamingMessage = mutation({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      agentId: args.agentId,
      clerkId: args.clerkId,
      role: "agent",
      content: "",
      timestamp: Date.now(),
      streaming: true,
    });
  },
});

export const appendToMessage = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    await ctx.db.patch(args.messageId, {
      content: msg.content + args.text,
    });
  },
});

export const finalizeMessage = mutation({
  args: {
    messageId: v.id("messages"),
    toolCalls: v.optional(v.array(v.object({
      tool: v.string(),
      args: v.optional(v.string()),
      result: v.optional(v.string()),
    }))),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      streaming: false,
      ...(args.toolCalls ? { toolCalls: args.toolCalls } : {}),
      ...(args.inputTokens !== undefined ? { inputTokens: args.inputTokens } : {}),
      ...(args.outputTokens !== undefined ? { outputTokens: args.outputTokens } : {}),
      ...(args.model ? { model: args.model } : {}),
      ...(args.provider ? { provider: args.provider } : {}),
    });
  },
});

export const getUsageStats = query({
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

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let messagesWithUsage = 0;

    for (const msg of messages) {
      if (msg.inputTokens || msg.outputTokens) {
        totalInputTokens += msg.inputTokens || 0;
        totalOutputTokens += msg.outputTokens || 0;
        messagesWithUsage++;
      }
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      messagesWithUsage,
      totalMessages: messages.length,
    };
  },
});

export const getUsageByAgent = query({
  args: {
    clerkId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_agent_and_user", (q) =>
        q.eq("agentId", args.agentId).eq("clerkId", args.clerkId)
      )
      .collect();

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let lastModel: string | undefined;
    let lastProvider: string | undefined;

    for (const msg of messages) {
      if (msg.inputTokens || msg.outputTokens) {
        totalInputTokens += msg.inputTokens || 0;
        totalOutputTokens += msg.outputTokens || 0;
        if (msg.model) lastModel = msg.model;
        if (msg.provider) lastProvider = msg.provider;
      }
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      lastModel,
      lastProvider,
    };
  },
});

export const getUsageAllAgents = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all agents for this user
    const agents = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("userId"), undefined as any)) // we'll filter by clerkId via messages
      .collect();

    // Collect all messages for this user across all agents
    // We need to iterate agents; Convex doesn't support OR on indexes
    // Instead, get all agents from agents table by userId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return { agents: [], totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCost: 0 };

    const userAgents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const agentStats = [];
    let grandInputTokens = 0;
    let grandOutputTokens = 0;

    for (const agent of userAgents) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_agent_and_user", (q) =>
          q.eq("agentId", agent._id).eq("clerkId", args.clerkId)
        )
        .collect();

      let inputTokens = 0;
      let outputTokens = 0;
      let lastModel: string | undefined;
      let lastProvider: string | undefined;
      let messageCount = 0;

      for (const msg of messages) {
        if (msg.inputTokens || msg.outputTokens) {
          inputTokens += msg.inputTokens || 0;
          outputTokens += msg.outputTokens || 0;
          if (msg.model) lastModel = msg.model;
          if (msg.provider) lastProvider = msg.provider;
          messageCount++;
        }
      }

      if (messageCount > 0) {
        agentStats.push({
          agentId: agent._id,
          name: agent.name,
          icon: agent.icon,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          lastModel,
          lastProvider,
          messageCount,
        });
      }

      grandInputTokens += inputTokens;
      grandOutputTokens += outputTokens;
    }

    return {
      agents: agentStats,
      totalInputTokens: grandInputTokens,
      totalOutputTokens: grandOutputTokens,
      totalTokens: grandInputTokens + grandOutputTokens,
    };
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
