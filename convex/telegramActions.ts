"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { encrypt, decrypt } from "./crypto";
import type { Id } from "./_generated/dataModel";

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
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes("can't parse")) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      return;
    }
    throw new Error(`Telegram API error: ${res.status} ${errText.slice(0, 200)}`);
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
    const webhookUrl = `https://autofound.ai/api/webhooks/telegram/${args.agentId}`;
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

// Handle incoming Telegram message for a specific agent
export const handleTelegramMessage = action({
  args: {
    agentId: v.id("agents"),
    chatId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.telegram.getAgentForWebhook, { agentId: args.agentId });
    if (!agent) {
      return; // agent deleted, ignore
    }

    const user = await ctx.runQuery(api.users.getUserById, { userId: agent.userId });
    if (!user) return;

    // Store telegram chat ID on agent if not set
    if (agent.telegramChatId !== args.chatId) {
      // We can't patch directly from action, but the chatId is used for lookups
      // For now we proceed without updating — the webhook URL already identifies the agent
    }

    // Store user message
    await ctx.runMutation(api.messages.send, {
      agentId: agent._id,
      clerkId: user.clerkId,
      content: args.text,
      source: "telegram",
    });

    // Poll for agent response
    const startTime = Date.now();
    const timeout = 120_000;

    const initialMsgs = await ctx.runQuery(api.messages.list, {
      agentId: agent._id,
      clerkId: user.clerkId,
    });
    const initialCount = initialMsgs.length;

    while (Date.now() - startTime < timeout) {
      await new Promise((r) => setTimeout(r, 2000));

      const msgs = await ctx.runQuery(api.messages.list, {
        agentId: agent._id,
        clerkId: user.clerkId,
      });

      if (msgs.length > initialCount) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.role === "agent" && !lastMsg.streaming && lastMsg.content) {
          await ctx.runAction(api.telegramActions.sendTelegramMessage, {
            agentId: args.agentId,
            chatId: args.chatId,
            text: lastMsg.content,
          });
          return;
        }
      }
    }

    await ctx.runAction(api.telegramActions.sendTelegramMessage, {
      agentId: args.agentId,
      chatId: args.chatId,
      text: "⏱ Response timed out. The agent may still be processing.",
    });
  },
});
