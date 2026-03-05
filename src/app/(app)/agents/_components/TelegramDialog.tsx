"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface TelegramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: Id<"agents">;
  botUsername?: string;
}

export function TelegramDialog({ open, onOpenChange, agentId, botUsername: initialBotUsername }: TelegramDialogProps) {
  const registerWebhook = useAction(api.telegramActions.registerWebhook);
  const unregisterWebhook = useAction(api.telegramActions.unregisterWebhook);
  const [botTokenInput, setBotTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [botUsername, setBotUsername] = useState(initialBotUsername);

  const handleConnect = async () => {
    if (!botTokenInput.trim()) return;
    setLoading(true);
    try {
      const result = await registerWebhook({ agentId, botToken: botTokenInput.trim() });
      setBotUsername(result.botUsername);
      setBotTokenInput("");
    } catch (e: any) {
      toast.error("Failed to connect: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await unregisterWebhook({ agentId });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to disconnect: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Telegram Integration</DialogTitle>
        </DialogHeader>
        {botUsername ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Connected as @{botUsername}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Users can message this agent via Telegram by chatting with @{botUsername}.
            </p>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>To connect this agent to Telegram:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open <a href="https://t.me/BotFather" target="_blank" className="text-cyan-400 hover:underline">@BotFather</a> on Telegram</li>
                <li>Send <code className="bg-white/10 px-1 rounded">/newbot</code> and follow the prompts</li>
                <li>Copy the bot token and paste it below</li>
              </ol>
            </div>
            <Input
              value={botTokenInput}
              onChange={(e) => setBotTokenInput(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
              className="font-mono"
            />
            <Button
              onClick={handleConnect}
              disabled={loading || !botTokenInput.trim()}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Connect
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
