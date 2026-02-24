import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Check per-user rate limits:
 * - Max 5 concurrent runs (status "running" or "starting")
 * - Max 100 runs per day
 */
export const checkRateLimit = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allRuns = await ctx.db
      .query("agentRuns")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Concurrent runs
    const concurrent = allRuns.filter(
      (r) => r.status === "running" || r.status === "starting"
    ).length;
    if (concurrent >= 5) {
      return { allowed: false as const, reason: "Too many concurrent runs (max 5). Wait for some to finish." };
    }

    // Daily limit
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dailyCount = allRuns.filter((r) => r.createdAt > dayAgo).length;
    if (dailyCount >= 100) {
      return { allowed: false as const, reason: "Daily run limit reached (100/day). Try again tomorrow." };
    }

    return { allowed: true as const };
  },
});
