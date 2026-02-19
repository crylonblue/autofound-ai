import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Internal mutation to update pod fields on agent
export const updatePodFields = internalMutation({
  args: {
    agentId: v.id("agents"),
    machineId: v.optional(v.string()),
    podUrl: v.optional(v.string()),
    podSecret: v.optional(v.string()),
    podStatus: v.optional(v.union(
      v.literal("provisioning"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("error")
    )),
    clearMachine: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.podStatus !== undefined) updates.podStatus = args.podStatus;
    if (args.machineId !== undefined) updates.machineId = args.machineId;
    if (args.podUrl !== undefined) updates.podUrl = args.podUrl;
    if (args.podSecret !== undefined) updates.podSecret = args.podSecret;
    if (args.clearMachine) {
      updates.machineId = undefined;
      updates.podUrl = undefined;
      updates.podSecret = undefined;
      updates.podStatus = undefined;
    }
    await ctx.db.patch(args.agentId, updates);
  },
});
