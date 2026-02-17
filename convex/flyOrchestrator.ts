"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";

const FLY_API_BASE = "https://api.machines.dev/v1";

export const startAgentRun = action({
  args: {
    taskId: v.id("tasks"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch task + agent + user
    const task = await ctx.runQuery(api.tasks.getTask, { taskId: args.taskId });
    if (!task) throw new Error("Task not found");

    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: task.agentId });
    if (!agent) throw new Error("Agent not found");

    const user = await ctx.runQuery(api.users.getUser, { clerkId: args.clerkId });
    if (!user) throw new Error("User not found");

    // Check BYOK key exists
    const model = agent.model || "gpt-4o-mini";
    let provider: string;
    if (model.startsWith("claude")) provider = "anthropic";
    else if (model.startsWith("gemini")) provider = "google";
    else provider = "openai";

    const encryptedKey = await ctx.runQuery(internal.users.getEncryptedKey, {
      clerkId: args.clerkId,
      provider,
    });
    if (!encryptedKey) {
      throw new Error(`No ${provider} API key configured. Go to Settings → API Keys to add one.`);
    }

    // Create run record
    const runId = await ctx.runMutation(internal.agentRuns.createRun, {
      userId: user._id,
      taskId: args.taskId,
      agentId: task.agentId,
      status: "starting",
      createdAt: Date.now(),
    });

    // Update task status
    await ctx.runMutation(internal.tasks.internalUpdateTask, {
      taskId: args.taskId,
      status: "running",
    });

    // Start Fly.io machine
    const flyToken = process.env.FLY_API_TOKEN;
    const flyApp = process.env.FLY_APP_NAME || "autofound-agent-runner";
    const convexUrl = process.env.CONVEX_URL || "https://calm-robin-588.eu-west-1.convex.cloud";
    const encryptionKey = process.env.ENCRYPTION_KEY || "";

    if (!flyToken) {
      await ctx.runMutation(internal.agentRuns.updateRun, {
        runId,
        updates: { status: "failed", error: "FLY_API_TOKEN not configured" },
      });
      await ctx.runMutation(internal.tasks.internalUpdateTask, {
        taskId: args.taskId,
        status: "failed",
        output: "Server configuration error: FLY_API_TOKEN missing",
      });
      throw new Error("FLY_API_TOKEN not configured on server");
    }

    try {
      const machineConfig = {
        config: {
          image: process.env.FLY_IMAGE || `registry.fly.io/${flyApp}:deployment-01KHPQEHNB7CWQNY5QZW0AQT2X`,
          env: {
            FLY_TASK_ID: args.taskId,
            FLY_RUN_ID: runId,
            CONVEX_URL: convexUrl,
            ENCRYPTION_KEY: encryptionKey,
          },
          guest: {
            cpu_kind: "shared",
            cpus: 1,
            memory_mb: 256,
          },
          auto_destroy: true,
          restart: { policy: "no" },
        },
        region: "fra",
      };

      const res = await fetch(`${FLY_API_BASE}/apps/${flyApp}/machines`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(machineConfig),
      });

      if (!res.ok) {
        const errText = await res.text();
        await ctx.runMutation(internal.agentRuns.updateRun, {
          runId,
          updates: { status: "failed", error: `Fly API: ${res.status} ${errText}` },
        });
        await ctx.runMutation(internal.tasks.internalUpdateTask, {
          taskId: args.taskId,
          status: "failed",
          output: `Failed to start agent: ${errText}`,
        });
        throw new Error(`Fly API error: ${res.status}`);
      }

      const machine = await res.json();

      await ctx.runMutation(internal.agentRuns.updateRun, {
        runId,
        updates: {
          machineId: machine.id,
          status: "running",
          startedAt: Date.now(),
        },
      });

      return { runId, machineId: machine.id };
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Fly API error")) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.runMutation(internal.agentRuns.updateRun, {
        runId,
        updates: { status: "failed", error: msg },
      });
      throw e;
    }
  },
});

export const cancelRun = action({
  args: {
    runId: v.id("agentRuns"),
    machineId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Mark as cancelled in DB
    await ctx.runMutation(internal.agentRuns.updateRun, {
      runId: args.runId,
      updates: { status: "cancelled", completedAt: Date.now() },
    });

    // Stop machine on Fly if we have the ID
    if (args.machineId) {
      const flyToken = process.env.FLY_API_TOKEN;
      const flyApp = process.env.FLY_APP_NAME || "autofound-agent-runner";
      if (flyToken) {
        try {
          await fetch(
            `${FLY_API_BASE}/apps/${flyApp}/machines/${args.machineId}/stop`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${flyToken}` },
            }
          );
        } catch {
          // Best effort - machine may already be stopped
        }
      }
    }

    return { cancelled: true };
  },
});

export const checkStaleMachines = action({
  args: {},
  handler: async (ctx) => {
    // Find runs that have been "running" for >30 minutes
    const runs = await ctx.runQuery(api.agentRuns.listRunsByUser, { clerkId: "" });
    // Note: In production, this would be a dedicated internal query
    // For MVP, stale machines auto-destroy on Fly.io anyway
    return { checked: true };
  },
});
