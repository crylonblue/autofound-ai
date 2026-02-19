"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import crypto from "crypto";

const FLY_API_BASE = "https://api.machines.dev/v1";
const FLY_APP = "autofound-agent-runner";
const CONVEX_URL = "https://calm-robin-588.convex.cloud";

function getFlyToken(): string {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error("FLY_API_TOKEN not set");
  return token;
}

async function flyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getFlyToken()}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

export const provisionPod = action({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent) throw new Error("Agent not found");

    // Mark as provisioning
    await ctx.runMutation(internal.podMutations.updatePodFields, {
      agentId: args.agentId,
      podStatus: "provisioning",
    });

    const podSecret = crypto.randomBytes(32).toString("hex");

    // Get the latest image from current machines (or use a known image)
    let image = `registry.fly.io/${FLY_APP}:latest`;
    try {
      const listRes = await flyFetch(`/apps/${FLY_APP}/machines`);
      if (listRes.ok) {
        const machines = await listRes.json();
        if (machines.length > 0 && machines[0].config?.image) {
          image = machines[0].config.image;
        }
      }
    } catch { /* use default image */ }

    const machineConfig = {
      name: `agent-${args.agentId}`,
      config: {
        image,
        env: {
          POD_SECRET: podSecret,
          AGENT_ID: args.agentId as string,
          CONVEX_URL,
        },
        guest: {
          cpu_kind: "shared",
          cpus: 1,
          memory_mb: 256,
        },
        auto_destroy: false,
        services: [
          {
            ports: [
              { port: 443, handlers: ["tls", "http"] },
              { port: 80, handlers: ["http"] },
            ],
            protocol: "tcp",
            internal_port: 8080,
            force_https: true,
          },
        ],
      },
    };

    const res = await flyFetch(`/apps/${FLY_APP}/machines`, {
      method: "POST",
      body: JSON.stringify(machineConfig),
    });

    if (!res.ok) {
      const err = await res.text();
      await ctx.runMutation(internal.podMutations.updatePodFields, {
        agentId: args.agentId,
        podStatus: "error",
      });
      throw new Error(`Failed to create machine: ${res.status} ${err}`);
    }

    const machine = await res.json();
    const machineId = machine.id;
    // Internal URL on Fly private network
    const podUrl = `http://${machineId}.vm.${FLY_APP}.internal:8080`;

    await ctx.runMutation(internal.podMutations.updatePodFields, {
      agentId: args.agentId,
      machineId,
      podUrl,
      podSecret,
      podStatus: "running",
    });

    return { machineId, podUrl };
  },
});

export const stopPod = action({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent?.machineId) throw new Error("No machine to stop");

    const res = await flyFetch(`/apps/${FLY_APP}/machines/${agent.machineId}/stop`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to stop machine: ${res.status} ${err}`);
    }

    await ctx.runMutation(internal.podMutations.updatePodFields, {
      agentId: args.agentId,
      podStatus: "stopped",
    });
  },
});

export const startPod = action({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent?.machineId) throw new Error("No machine to start");

    const res = await flyFetch(`/apps/${FLY_APP}/machines/${agent.machineId}/start`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to start machine: ${res.status} ${err}`);
    }

    await ctx.runMutation(internal.podMutations.updatePodFields, {
      agentId: args.agentId,
      podStatus: "running",
    });
  },
});

export const destroyPod = action({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent?.machineId) return; // No machine, nothing to do

    const res = await flyFetch(`/apps/${FLY_APP}/machines/${agent.machineId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    // 404 = already gone, that's fine
    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      throw new Error(`Failed to destroy machine: ${res.status} ${err}`);
    }

    await ctx.runMutation(internal.podMutations.updatePodFields, {
      agentId: args.agentId,
      clearMachine: true,
    });
  },
});

export const podExec = action({
  args: {
    agentId: v.id("agents"),
    command: v.string(),
    timeout: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent?.podUrl || !agent?.podSecret) throw new Error("Agent has no running pod");

    const res = await fetch(`${agent.podUrl}/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agent.podSecret}`,
      },
      body: JSON.stringify({
        command: args.command,
        timeout: args.timeout || 30,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pod exec failed: ${res.status} ${err}`);
    }

    return await res.json();
  },
});

export const podFileRead = action({
  args: {
    agentId: v.id("agents"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent?.podUrl || !agent?.podSecret) throw new Error("Agent has no running pod");

    const res = await fetch(`${agent.podUrl}/files/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agent.podSecret}`,
      },
      body: JSON.stringify({ path: args.path }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pod file read failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.content;
  },
});

export const podFileWrite = action({
  args: {
    agentId: v.id("agents"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.runQuery(api.agents.getAgent, { agentId: args.agentId });
    if (!agent?.podUrl || !agent?.podSecret) throw new Error("Agent has no running pod");

    const res = await fetch(`${agent.podUrl}/files/write`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agent.podSecret}`,
      },
      body: JSON.stringify({ path: args.path, content: args.content }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pod file write failed: ${res.status} ${err}`);
    }

    return await res.json();
  },
});
