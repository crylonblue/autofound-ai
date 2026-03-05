"use client";

import { useState } from "react";
import { toast } from "sonner";

interface WaitlistFormProps {
  variant?: "hero" | "cta";
}

export default function WaitlistForm({ variant = "hero" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      toast.success("You're on the list! We'll be in touch soon.");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isHero = variant === "hero";

  return (
    <form onSubmit={handleSubmit} className={`flex gap-3 ${isHero ? "flex-col sm:flex-row" : "flex-col sm:flex-row justify-center"} w-full max-w-md ${!isHero ? "mx-auto" : ""}`}>
      <input
        type="email"
        placeholder="Enter your work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {loading ? "Joining..." : "Start Free"}
      </button>
    </form>
  );
}
