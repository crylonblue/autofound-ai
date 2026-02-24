"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const FLY_API_BASE = "https://api.machines.dev/v1";

export const cleanupStaleRuns = internalAction({
  args: {},
  handler: async (ctx) => {
    const staleRuns = await ctx.runQuery(internal.cleanupQueries.getStaleRuns, {});

    for (const run of staleRuns) {
      await ctx.runMutation(internal.agentRuns.updateRun, {
        runId: run._id,
        updates: {
          status: "failed",
          error: "Timed out after 30 minutes",
          completedAt: Date.now(),
        },
      });

      if (run.machineId) {
        const flyToken = process.env.FLY_API_TOKEN;
        const flyApp = process.env.FLY_APP_NAME || "autofound-agent-runner";
        if (flyToken) {
          try {
            await fetch(
              `${FLY_API_BASE}/apps/${flyApp}/machines/${run.machineId}/stop`,
              { method: "POST", headers: { Authorization: `Bearer ${flyToken}` } }
            );
          } catch { /* best effort */ }
        }
      }
    }

    if (staleRuns.length > 0) {
      console.log(`[cleanup] Marked ${staleRuns.length} stale runs as failed`);
    }
  },
});
