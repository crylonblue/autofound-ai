import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

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

    // Validate agentId looks like a Convex ID (basic sanity check)
    if (!agentId || agentId.length < 10) {
      console.error("Invalid agentId in Telegram webhook:", agentId);
      return NextResponse.json({ ok: true });
    }

    const typedAgentId = agentId as Id<"agents">;

    if (text === "/start") {
      convex
        .action(api.telegramActions.sendTelegramMessage, {
          agentId: typedAgentId,
          chatId,
          text: "👋 Welcome! Send me a message and I'll respond as your AI agent.",
        })
        .catch(console.error);
      return NextResponse.json({ ok: true });
    }

    // Handle regular message — fire and forget
    // chatRunner will send the reply back to Telegram via callback
    convex
      .action(api.telegramActions.handleTelegramMessage, {
        agentId: typedAgentId,
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
