"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { encrypt, decrypt } from "./crypto";

// Send a Telegram message using the agent's own bot token
export const sendTelegramMessage = action({
  args: {
    agentId: v.id("agents"),
    chatId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.telegram.getAgentForWebhook, { agentId: args.agentId });
    if (!agent?.telegramBotToken) throw new Error("Agent has no Telegram bot token");

    const token = decrypt(agent.telegramBotToken);
    await sendWithToken(token, args.chatId, args.text);
  },
});

async function sendWithToken(token: string, chatId: string, text: string) {
  // Telegram has a 4096 char limit per message — split if needed
  const chunks = [];
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000));
  }
  for (const chunk of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Markdown parse failure — retry without parse_mode
      if (errText.includes("can't parse")) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: chunk }),
        });
        continue;
      }
      throw new Error(`Telegram API error: ${res.status} ${errText.slice(0, 200)}`);
    }
  }
}

// Register webhook with Telegram + fetch bot username
export const registerWebhook = action({
  args: {
    agentId: v.id("agents"),
    botToken: v.string(), // plaintext token
  },
  handler: async (ctx, args) => {
    const token = args.botToken;

    // Get bot info
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!meRes.ok) throw new Error("Invalid bot token — getMe failed");
    const meData = await meRes.json();
    const botUsername = meData.result.username;

    // Set webhook
    const webhookUrl = `https://www.autofound.ai/api/webhooks/telegram/${args.agentId}`;
    const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    if (!whRes.ok) {
      const err = await whRes.text();
      throw new Error(`Failed to set webhook: ${err.slice(0, 200)}`);
    }

    // Encrypt and store
    const encryptedToken = encrypt(token);
    await ctx.runMutation(api.telegram.saveBotToken, {
      agentId: args.agentId,
      encryptedToken,
      botUsername,
    });

    return { botUsername };
  },
});

// Unregister webhook from Telegram
export const unregisterWebhook = action({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.telegram.getAgentForWebhook, { agentId: args.agentId });
    if (agent?.telegramBotToken) {
      const token = decrypt(agent.telegramBotToken);
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`).catch(() => {});
    }
    await ctx.runMutation(api.telegram.removeBotToken, { agentId: args.agentId });
  },
});

// Handle incoming Telegram message — store it and let chatRunner reply via callback
export const handleTelegramMessage = action({
  args: {
    agentId: v.id("agents"),
    chatId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.telegram.getAgentForWebhook, { agentId: args.agentId });
    if (!agent) return; // agent deleted

    const user = await ctx.runQuery(api.users.getUserById, { userId: agent.userId });
    if (!user) return;

    // Save telegramChatId on agent if not set (for future lookups)
    if (agent.telegramChatId !== args.chatId) {
      await ctx.runMutation(api.telegram.saveChatId, {
        agentId: args.agentId,
        chatId: args.chatId,
      });
    }

    // Send typing indicator
    if (agent.telegramBotToken) {
      const token = decrypt(agent.telegramBotToken);
      await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: args.chatId, action: "typing" }),
      }).catch(() => {});
    }

    // Store user message — this triggers chatRunner.respondToMessage via scheduler
    // Pass telegramChatId so chatRunner sends the reply back to Telegram directly
    await ctx.runMutation(api.messages.send, {
      agentId: agent._id,
      clerkId: user.clerkId,
      content: args.text,
      source: "telegram",
      telegramChatId: args.chatId,
    });
  },
});
