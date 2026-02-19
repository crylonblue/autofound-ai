import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles (synced from Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Encrypted API keys (AES-256-GCM)
    apiKeys: v.optional(v.object({
      openai: v.optional(v.string()),
      anthropic: v.optional(v.string()),
      google: v.optional(v.string()),
    })),
    // Masked display values (e.g. "sk-••••abcd")
    apiKeyMasks: v.optional(v.object({
      openai: v.optional(v.string()),
      anthropic: v.optional(v.string()),
      google: v.optional(v.string()),
    })),
    onboardingDismissed: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Agent templates
  agents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    icon: v.string(),
    color: v.string(),
    systemPrompt: v.string(),
    model: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    reportsTo: v.optional(v.id("agents")),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("draft")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Tasks assigned to agents
  tasks: defineTable({
    userId: v.id("users"),
    agentId: v.id("agents"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("needs_approval"), v.literal("completed"), v.literal("failed")),
    output: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]).index("by_agent", ["agentId"]),

  // Agent runs (Fly.io machine tracking)
  agentRuns: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
    machineId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("starting"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    // Streaming progress
    progressText: v.optional(v.string()),
    toolCalls: v.optional(v.array(v.object({
      tool: v.string(),
      args: v.optional(v.string()),
      result: v.optional(v.string()),
      timestamp: v.number(),
    }))),
    // Token usage
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    // Final output
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]).index("by_user", ["userId"]),

  // Chat messages
  messages: defineTable({
    agentId: v.id("agents"),
    clerkId: v.string(),
    role: v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
    toolCalls: v.optional(v.array(v.object({
      tool: v.string(),
      args: v.optional(v.string()),
      result: v.optional(v.string()),
    }))),
    streaming: v.optional(v.boolean()),
    // Token usage tracking
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
  }).index("by_agent_and_user", ["agentId", "clerkId"]),

  // Org chart connections
  orgConnections: defineTable({
    userId: v.id("users"),
    parentAgentId: v.id("agents"),
    childAgentId: v.id("agents"),
  }).index("by_user", ["userId"]),

  // Heartbeat records for always-on agents
  heartbeats: defineTable({
    agentId: v.id("agents"),
    clerkId: v.string(),
    lastRun: v.optional(v.number()),
    lastResult: v.optional(v.string()),
    status: v.string(), // "active" | "paused" | "running"
    runCount: v.number(),
  }).index("by_agent", ["agentId"]).index("by_clerk_id", ["clerkId"]),

  // Org chart node positions (persisted layout)
  orgNodePositions: defineTable({
    userId: v.id("users"),
    // "founder" for the user node, or agent._id for agents
    nodeKey: v.string(),
    x: v.number(),
    y: v.number(),
  }).index("by_user", ["userId"]),
});
