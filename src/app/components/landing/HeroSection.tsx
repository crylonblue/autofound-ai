"use client";

import dynamic from "next/dynamic";
import GradientMeshBackground from "./GradientMeshBackground";
import DotGridBackground from "./DotGridBackground";
import WaitlistForm from "./WaitlistForm";

const ModelPreviewCanvas = dynamic(
  () => import("@/components/ModelPicker").then((m) => ({ default: m.ModelPreviewCanvas })),
  { ssr: false }
);

const agents = [
  {
    name: "Marketing Agent",
    modelId: "marketing",
    stat: "47 posts published",
    delay: "stagger-1",
    float: "animate-float",
  },
  {
    name: "Sales Agent",
    modelId: "sales",
    stat: "200 leads researched",
    delay: "stagger-2",
    float: "animate-float-delayed",
  },
  {
    name: "CEO Agent",
    modelId: "ceo",
    stat: "15 reports generated",
    delay: "stagger-3",
    float: "animate-float-slow",
  },
  {
    name: "Dev Agent",
    modelId: "dev",
    stat: "340 tickets resolved",
    delay: "stagger-4",
    float: "animate-float",
  },
];

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden min-h-[90vh] flex items-center">
      <GradientMeshBackground />
      <DotGridBackground />

      <div className="relative max-w-6xl mx-auto w-full">
        {/* Center content */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm text-zinc-300 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-status-pulse" />
            Your AI workforce is ready
          </div>

          {/* Headline */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] animate-fade-in-up animate-delay-100">
            Hire AI agents that
            <br />
            <span className="text-gradient">actually get work done.</span>
          </h1>

          {/* Sub */}
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in-up animate-delay-200">
            Marketing, research, sales, operations — your AI team works 24/7
            so you can focus on what matters most.
          </p>

          {/* Waitlist */}
          <div className="mt-10 flex justify-center animate-fade-in-up animate-delay-300">
            <WaitlistForm variant="hero" />
          </div>

          {/* Trust line */}
          <p className="mt-4 text-sm text-zinc-600 animate-fade-in-up animate-delay-400">
            Free to start &middot; No coding required &middot; Results in minutes
          </p>
        </div>

        {/* Floating agent cards */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`glass-card rounded-2xl p-4 text-center glow-blue animate-fade-in-up ${agent.delay} ${agent.float}`}
            >
              <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-white/5 border border-white/10">
                <ModelPreviewCanvas
                  modelId={agent.modelId}
                  className="w-full h-full"
                />
              </div>
              <p className="text-sm font-medium text-white">{agent.name}</p>
              <p className="text-xs text-zinc-500 mt-1">{agent.stat}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-status-pulse" />
                <span className="text-[10px] text-green-400">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
