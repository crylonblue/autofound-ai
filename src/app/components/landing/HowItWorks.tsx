import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    n: "01",
    title: "Define your agent",
    desc: "Name it, pick a model, write a system prompt. Your agent, your rules.",
    visual: (
      <pre className="text-xs text-zinc-500 font-mono leading-relaxed mt-3">
{`name: research-bot
model: claude-sonnet-4
prompt: "You are a research
  assistant that..."`}
      </pre>
    ),
  },
  {
    n: "02",
    title: "Attach skills",
    desc: "Snap in modular skill packs — web research, file management, pod compute, and more.",
    visual: (
      <div className="flex flex-wrap gap-1.5 mt-3">
        {["Web Research", "Memory", "Pod Compute"].map((s) => (
          <span key={s} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
            {s}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: "03",
    title: "Deploy and run",
    desc: "One click to deploy. Agents execute in isolated containers with an always-on heartbeat.",
    visual: (
      <div className="mt-3 font-mono text-xs space-y-1">
        <div className="text-emerald-400">$ agent deploy research-bot</div>
        <div className="text-zinc-500">Deploying to Fly.io...</div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-emerald-400">Live — heartbeat active</span>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <Card key={s.n} className="bg-white/[0.02] border-white/5 hover:border-blue-500/30 transition">
              <CardContent className="pt-6">
                <span className="text-blue-500 font-mono text-sm">{s.n}</span>
                <h3 className="mt-2 text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed text-sm">{s.desc}</p>
                {s.visual}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
