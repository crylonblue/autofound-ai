"use client";

import dynamic from "next/dynamic";
import { useScrollReveal } from "./useScrollReveal";

const ModelPreviewCanvas = dynamic(
  () => import("@/components/ModelPicker").then((m) => ({ default: m.ModelPreviewCanvas })),
  { ssr: false }
);

const agents = [
  {
    name: "Strategy Agent",
    modelId: "ceo",
    description: "Analyzes market trends, generates reports, and recommends strategic decisions for your business.",
    skills: ["Research", "Analysis", "Reporting"],
  },
  {
    name: "Marketing Agent",
    modelId: "marketing",
    description: "Creates content, manages campaigns, tracks performance, and optimizes your marketing efforts.",
    skills: ["Content", "SEO", "Social Media"],
  },
  {
    name: "Sales Agent",
    modelId: "sales",
    description: "Researches prospects, crafts personalized outreach, and follows up to book meetings.",
    skills: ["Prospecting", "Outreach", "CRM"],
  },
  {
    name: "Operations Agent",
    modelId: "dev",
    description: "Handles data entry, processes documents, manages schedules, and automates repetitive tasks.",
    skills: ["Data Entry", "Documents", "Scheduling"],
  },
];

export default function AgentTeamPreview() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Meet your <span className="text-gradient">AI team</span>
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Pre-built agents ready to work across every department. Customize them to fit your needs.
          </p>
        </div>

        <div
          ref={ref}
          className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="glass-card rounded-2xl overflow-hidden text-center hover:bg-white/[0.04] transition-colors group"
            >
              <div className="h-40 bg-white/[0.02]">
                <ModelPreviewCanvas
                  modelId={agent.modelId}
                  className="w-full h-full"
                />
              </div>
              <div className="p-5 pt-3">
                <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                <div className="flex items-center justify-center gap-1.5 mt-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-status-pulse" />
                  <span className="text-xs text-green-400">Active</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{agent.description}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {agent.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
