"use client";

import Image from "next/image";
import { useScrollReveal } from "./useScrollReveal";

const agents = [
  {
    name: "Strategy Agent",
    img: "/models/agent-ceo.png",
    description: "Analyzes market trends, generates reports, and recommends strategic decisions for your business.",
    skills: ["Research", "Analysis", "Reporting"],
  },
  {
    name: "Marketing Agent",
    img: "/models/agent-marketing.png",
    description: "Creates content, manages campaigns, tracks performance, and optimizes your marketing efforts.",
    skills: ["Content", "SEO", "Social Media"],
  },
  {
    name: "Sales Agent",
    img: "/models/agent-sales.png",
    description: "Researches prospects, crafts personalized outreach, and follows up to book meetings.",
    skills: ["Prospecting", "Outreach", "CRM"],
  },
  {
    name: "Operations Agent",
    img: "/models/agent-dev.png",
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
              className="glass-card rounded-2xl p-6 text-center hover:bg-white/[0.04] transition-colors group"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-blue-500/30 transition-colors">
                <Image
                  src={agent.img}
                  alt={agent.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
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
          ))}
        </div>
      </div>
    </section>
  );
}
