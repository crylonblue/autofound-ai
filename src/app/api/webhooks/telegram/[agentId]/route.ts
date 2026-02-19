import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const update = await req.json();
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    if (text === "/start") {
      // Send welcome via the agent's own bot token
      convex
        .action(api.telegramActions.sendTelegramMessage, {
          agentId: agentId as any,
          chatId,
          text: "👋 Welcome! Send me a message and I'll respond as your AI agent.",
        })
        .catch(console.error);
      return NextResponse.json({ ok: true });
    }

    // Handle regular message — fire and forget
    convex
      .action(api.telegramActions.handleTelegramMessage, {
        agentId: agentId as any,
        chatId,
        text,
      })
      .catch((err) => {
        console.error("Telegram handler error:", err);
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
