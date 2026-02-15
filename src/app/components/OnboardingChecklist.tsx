"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Key, Users, ListTodo, CheckCircle2, Circle, X, Rocket } from "lucide-react";

export default function OnboardingChecklist() {
  const { user: clerkUser } = useUser();
  const clerkId = clerkUser?.id ?? "";

  const state = useQuery(api.users.getOnboardingState, clerkId ? { clerkId } : "skip");
  const dismiss = useMutation(api.users.dismissOnboarding);

  if (!state || state.dismissed || state.allComplete) return null;

  const steps = [
    {
      done: state.hasApiKeys,
      label: "Add an API key",
      description: "Connect OpenAI, Anthropic, or Google",
      href: "/settings",
      icon: Key,
    },
    {
      done: state.hasAgents,
      label: "Hire your first agent",
      description: "Pick a template or create a custom role",
      href: "/agents",
      icon: Users,
    },
    {
      done: state.hasTasks,
      label: "Create your first task",
      description: "Assign work and see AI in action",
      href: "/tasks",
      icon: ListTodo,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="relative bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 mb-6">
      <button
        onClick={() => dismiss({ clerkId })}
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-4">
        <Rocket className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-sm">Get Started</h3>
        <span className="text-xs text-zinc-400 ml-auto mr-6">
          {completedCount}/{steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              step.done
                ? "bg-white/[0.02] opacity-60"
                : "bg-white/[0.04] hover:bg-white/[0.08]"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-zinc-500" : ""}`}>
                {step.label}
              </p>
              <p className="text-xs text-zinc-500">{step.description}</p>
            </div>
            {!step.done && (
              <step.icon className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
