import { Badge } from "@/components/ui/badge";

const tech = [
  "Next.js",
  "Convex",
  "Fly.io",
  "Clerk",
  "Anthropic",
  "OpenAI",
  "Google AI",
];

export default function TechBar() {
  return (
    <section className="py-10 px-6 border-y border-white/5">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs text-zinc-600 uppercase tracking-wider mr-2">Powered by</span>
        {tech.map((t) => (
          <Badge key={t} variant="outline" className="text-zinc-400 border-white/10 bg-white/[0.02]">
            {t}
          </Badge>
        ))}
      </div>
    </section>
  );
}
