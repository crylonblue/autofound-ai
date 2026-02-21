import { v } from "convex/values";
import { mutation, internalQuery } from "./_generated/server";

// Save encrypted bot token + username on agent
export const saveBotToken = mutation({
  args: {
    agentId: v.id("agents"),
    encryptedToken: v.string(),
    botUsername: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      telegramBotToken: args.encryptedToken,
      telegramBotUsername: args.botUsername,
    });
  },
});

// Remove bot token from agent
export const removeBotToken = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      telegramBotToken: undefined,
      telegramBotUsername: undefined,
      telegramChatId: undefined,
    });
  },
});

// Get agent by ID for webhook handler (internal)
export const getAgentForWebhook = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

// Save telegram chat ID on agent
export const saveChatId = mutation({
  args: {
    agentId: v.id("agents"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      telegramChatId: args.chatId,
    });
  },
});

// Get agent by telegram chat ID (still useful for lookups)
export const getAgentByChatId = internalQuery({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_telegram_chat_id", (q) => q.eq("telegramChatId", args.chatId))
      .first();
  },
});
