import { internalQuery } from "./_generated/server";

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const getStaleRuns = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_THRESHOLD_MS;
    const allRuns = await ctx.db.query("agentRuns").collect();
    return allRuns.filter(
      (r) =>
        (r.status === "running" || r.status === "starting") &&
        r.createdAt < cutoff
    );
  },
});
