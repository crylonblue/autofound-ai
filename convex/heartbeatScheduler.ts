"use node";

import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

export const runAllHeartbeats = internalAction({
  handler: async (ctx) => {
    const activeHeartbeats = await ctx.runQuery(internal.heartbeats.listActive);
    for (const hb of activeHeartbeats) {
      await ctx.scheduler.runAfter(0, api.heartbeatRunner.runHeartbeat, {
        agentId: hb.agentId,
        clerkId: hb.clerkId,
      });
    }
  },
});
