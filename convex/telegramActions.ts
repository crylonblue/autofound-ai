"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const sendTelegramMessage = action({
  args: {
    chatId: v.string(),
    text: v.string(),
  },
  handler: async (_ctx, args) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: args.chatId, text: args.text, parse_mode: "Markdown" }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes("can't parse")) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: args.chatId, text: args.text }),
        });
        return;
      }
      throw new Error(`Telegram API error: ${res.status} ${errText.slice(0, 200)}`);
    }
  },
});

export const verifyLinkCode = action({
  args: {
    linkCode: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.telegram.internalLinkChat, {
      linkCode: args.linkCode.toUpperCase(),
      chatId: args.chatId,
    });
  },
});

export const unlinkChat = action({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.telegram.internalUnlinkChat, { chatId: args.chatId });
  },
});

export const handleTelegramMessage = action({
  args: {
    chatId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(internal.telegram.getAgentByChatId, { chatId: args.chatId });

    if (!agent) {
      await ctx.runAction(api.telegramActions.sendTelegramMessage, {
        chatId: args.chatId,
        text: "❌ No agent linked to this chat. Use /link CODE to connect an agent.",
      });
      return;
    }

    const user = await ctx.runQuery(api.users.getUserById, { userId: agent.userId });
    if (!user) {
      await ctx.runAction(api.telegramActions.sendTelegramMessage, {
        chatId: args.chatId,
        text: "❌ Agent owner not found.",
      });
      return;
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
            chatId: args.chatId,
            text: lastMsg.content,
          });
          return;
        }
      }
    }

    await ctx.runAction(api.telegramActions.sendTelegramMessage, {
      chatId: args.chatId,
      text: "⏱ Response timed out. The agent may still be processing.",
    });
  },
});
