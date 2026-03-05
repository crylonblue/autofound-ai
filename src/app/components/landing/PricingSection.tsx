"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "./useScrollReveal";

const pricing = [
  {
    name: "Starter",
    price: "Free",
    sub: "forever",
    highlight: "3 agents included",
    features: [
      "All core agent capabilities",
      "Web research & content creation",
      "Email & chat support",
      "Basic reporting dashboard",
      "Community templates",
    ],
  },
  {
    name: "Growth",
    price: "$29",
    sub: "/month",
    highlight: "15 agents included",
    popular: true,
    features: [
      "Everything in Starter",
      "Priority task execution",
      "Advanced analytics & insights",
      "Custom agent workflows",
      "Scheduled agent tasks",
      "Priority support",
    ],
  },
  {
    name: "Business",
    price: "$79",
    sub: "/month",
    highlight: "Unlimited agents",
    features: [
      "Everything in Growth",
      "Team collaboration & sharing",
      "Custom integrations",
      "Dedicated account manager",
      "Advanced security controls",
      "Unlimited scheduled tasks",
    ],
  },
];

export default function PricingSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="pricing" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Simple, transparent <span className="text-gradient">pricing</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>

        <div
          ref={ref}
          className={`grid md:grid-cols-3 gap-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl p-6 ${
                p.popular
                  ? "glass-card border-blue-500/30 glow-blue"
                  : "glass-card"
              }`}
            >
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
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-sm text-zinc-400 flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
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
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-zinc-600 mt-8">
          All plans include full security and a 14-day money-back guarantee.
        </p>
      </div>
    </section>
  );
}
