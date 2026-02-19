import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

// Generate a random 6-char alphanumeric code
function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const generateLinkCode = mutation({
  args: {
    agentId: v.id("agents"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("telegramLinks")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
    for (const link of existing) {
      if (!link.chatId) {
        await ctx.db.delete(link._id);
      }
    }
    const code = randomCode();
    await ctx.db.insert("telegramLinks", {
      agentId: args.agentId,
      clerkUserId: args.clerkId,
      linkCode: code,
      createdAt: Date.now(),
    });
    return code;
  },
});

export const internalLinkChat = internalMutation({
  args: {
    linkCode: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("telegramLinks")
      .withIndex("by_link_code", (q) => q.eq("linkCode", args.linkCode))
      .first();
    if (!link) return { success: false as const, error: "Invalid code" };
    if (link.chatId) return { success: false as const, error: "Code already used" };

    await ctx.db.patch(link._id, { chatId: args.chatId, linkedAt: Date.now() });
    await ctx.db.patch(link.agentId, { telegramChatId: args.chatId });
    const agent = await ctx.db.get(link.agentId);
    return { success: true as const, agentName: agent?.name ?? "Agent" };
  },
});

export const internalUnlinkChat = internalMutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_telegram_chat_id", (q) => q.eq("telegramChatId", args.chatId))
      .collect();
    if (agents.length === 0) return { success: false as const, error: "No agent linked to this chat" };
    for (const agent of agents) {
      await ctx.db.patch(agent._id, { telegramChatId: undefined });
    }
    const links = await ctx.db
      .query("telegramLinks")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }
    return { success: true as const, agentName: agents[0].name };
  },
});

export const getAgentByChatId = internalQuery({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_telegram_chat_id", (q) => q.eq("telegramChatId", args.chatId))
      .first();
  },
});

export const getLinkByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramLinks")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
  },
});
