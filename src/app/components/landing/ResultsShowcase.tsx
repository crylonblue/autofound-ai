"use client";

import { useScrollReveal } from "./useScrollReveal";

const testimonials = [
  {
    quote: "We replaced 3 freelancers with autofound agents. The work gets done faster, more consistently, and at a fraction of the cost.",
    name: "Sarah Chen",
    role: "Founder, GrowthMetrics",
    metric: "340% ROI in 90 days",
  },
  {
    quote: "Our sales team went from manually researching 20 leads a day to having 200 fully enriched prospects every morning.",
    name: "Marcus Rodriguez",
    role: "VP Sales, CloudReach",
    metric: "10x lead volume",
  },
  {
    quote: "I'm not technical at all. I just told the agent what I needed and it delivered a complete competitive analysis in 20 minutes.",
    name: "Emily Nakamura",
    role: "Marketing Director, BrightPath",
    metric: "20 min vs 2 days",
  },
];

export default function ResultsShowcase() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Real results. <span className="text-gradient">Real businesses.</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            See how teams are getting more done with fewer resources.
          </p>
        </div>

        <div
          ref={ref}
          className={`grid md:grid-cols-3 gap-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="glass-card rounded-xl p-6 flex flex-col"
            >
              <div className="flex-1">
                <svg className="w-8 h-8 text-blue-500/30 mb-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.role}</p>
                <div className="mt-3 inline-flex px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <span className="text-xs font-medium text-blue-400">{t.metric}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
