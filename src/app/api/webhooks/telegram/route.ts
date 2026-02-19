import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

async function sendTelegram(chatId: string, text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes("can't parse")) {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
        }
      );
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    if (text === "/start") {
      await sendTelegram(
        chatId,
        "👋 Welcome to Autofound AI!\n\n" +
          "To connect this chat to one of your agents:\n" +
          "1. Go to your agent on autofound.ai\n" +
          '2. Click "Connect Telegram"\n' +
          "3. Send /link CODE here\n\n" +
          "Commands:\n" +
          "/link CODE — Link an agent\n" +
          "/unlink — Unlink current agent"
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/link ")) {
      const code = text.slice(6).trim().toUpperCase();
      if (!code || code.length !== 6) {
        await sendTelegram(chatId, "❌ Please provide a valid 6-character code. Usage: /link ABC123");
        return NextResponse.json({ ok: true });
      }
      const result = await convex.action(api.telegramActions.verifyLinkCode, { linkCode: code, chatId });
      if (result.success) {
        await sendTelegram(chatId, `✅ Linked to *${result.agentName}*! You can now chat with your agent here.`);
      } else {
        await sendTelegram(chatId, `❌ ${result.error}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (text === "/unlink") {
      const result = await convex.action(api.telegramActions.unlinkChat, { chatId });
      if (result.success) {
        await sendTelegram(chatId, `✅ Unlinked from *${result.agentName}*. Use /link CODE to connect another agent.`);
      } else {
        await sendTelegram(chatId, `❌ ${result.error}`);
      }
      return NextResponse.json({ ok: true });
    }

    // Regular message — fire and forget
    convex.action(api.telegramActions.handleTelegramMessage, { chatId, text }).catch((err) => {
      console.error("Telegram handler error:", err);
      sendTelegram(chatId, "❌ Something went wrong processing your message.").catch(() => {});
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Telegram webhook active" });
}
