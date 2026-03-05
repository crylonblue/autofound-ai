"use client";

import AnimatedCounter from "./AnimatedCounter";
import { useScrollReveal } from "./useScrollReveal";

const stats = [
  { end: 2847, suffix: "+", label: "Tasks completed" },
  { end: 150, suffix: "+", label: "Companies using autofound" },
  { end: 99, suffix: ".9%", label: "Uptime" },
  { end: 60, prefix: "< ", suffix: "s", label: "To first result" },
];

export default function SocialProof() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-16 px-6 border-t border-b border-white/5">
      <div
        ref={ref}
        className={`max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white">
              <AnimatedCounter
                end={stat.end}
                suffix={stat.suffix}
                prefix={stat.prefix}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
