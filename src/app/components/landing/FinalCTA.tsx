"use client";

import GradientMeshBackground from "./GradientMeshBackground";
import WaitlistForm from "./WaitlistForm";

export default function FinalCTA() {
  return (
    <section className="relative py-24 px-6 border-t border-white/5 overflow-hidden">
      <GradientMeshBackground />
      <div className="relative max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          Stop hiring.{" "}
          <span className="text-gradient">Start deploying.</span>
        </h2>
        <p className="mt-6 text-zinc-400 max-w-lg mx-auto">
          Join thousands of businesses using AI agents to get more done. Free to start, no credit card required.
        </p>
        <div className="mt-10">
          <WaitlistForm variant="cta" />
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          Free to start &middot; No coding required &middot; Cancel anytime
        </p>
      </div>
    </section>
  );
}
