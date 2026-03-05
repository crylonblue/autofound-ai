import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Shield, HeartPulse, Puzzle } from "lucide-react";

const features = [
  {
    icon: KeyRound,
    title: "Bring Your Own Keys",
    desc: "Connect your own API keys. Encrypted at rest, never logged. Your usage, your costs, full control.",
    accent: "text-amber-400",
  },
  {
    icon: Shield,
    title: "Isolated Execution",
    desc: "Every agent run spins up an ephemeral Fly.io container. No shared state, no cross-contamination.",
    accent: "text-emerald-400",
  },
  {
    icon: HeartPulse,
    title: "Always-On Heartbeat",
    desc: "Agents wake up on a schedule to do proactive work — monitoring, reporting, follow-ups — without prompting.",
    accent: "text-pink-400",
  },
  {
    icon: Puzzle,
    title: "Modular Skills",
    desc: "Composable tool packs that snap into any agent. Mix and match capabilities without custom integration.",
    accent: "text-blue-400",
  },
];

export default function Differentiators() {
  return (
    <section className="py-24 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Built different.
        </h2>
        <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
          Not another chatbot wrapper. A real execution platform for autonomous agents.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="bg-white/[0.02] border-white/5 hover:border-white/10 transition">
              <CardContent className="pt-6">
                <f.icon className={`w-6 h-6 mb-3 ${f.accent}`} />
                <h3 className="font-semibold text-white text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
