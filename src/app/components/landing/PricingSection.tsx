import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const pricing = [
  {
    name: "Starter",
    price: "Free",
    sub: "forever",
    highlight: "3 agents",
    features: ["6 built-in skill packs", "BYOK (bring your own keys)", "Community templates", "1 heartbeat per agent"],
  },
  {
    name: "Growth",
    price: "$29",
    sub: "/month",
    highlight: "15 agents",
    features: ["All Starter features", "Custom skill packs", "Priority execution", "5 heartbeats per agent", "Priority support"],
    popular: true,
  },
  {
    name: "Business",
    price: "$79",
    sub: "/month",
    highlight: "Unlimited agents",
    features: ["All Growth features", "API access", "Team collaboration", "Unlimited heartbeats", "Custom integrations"],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Simple pricing
        </h2>
        <p className="text-zinc-400 text-center mb-14">
          You bring the API keys. We bring the infrastructure.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {pricing.map((p) => (
            <Card
              key={p.name}
              className={`flex flex-col ${
                p.popular
                  ? "border-blue-500/50 bg-blue-500/5"
                  : "bg-white/[0.02] border-white/5"
              }`}
            >
              <CardContent className="pt-6 flex flex-col flex-1">
                {p.popular && (
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-4">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{p.price}</span>
                  <span className="text-zinc-500 text-sm">{p.sub}</span>
                </div>
                <p className="mt-2 text-blue-400 text-sm font-medium">{p.highlight}</p>
                <ul className="mt-6 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-sm text-zinc-400 flex items-center gap-2">
                      <span className="text-blue-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={p.popular ? "default" : "secondary"}
                  asChild
                >
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-zinc-600 mt-8">
          All plans include BYOK — use your own API keys from OpenAI, Anthropic, Google AI, and more.
        </p>
      </div>
    </section>
  );
}
