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
    // Persistent Fly Machine (pod) fields
    machineId: v.optional(v.string()),
    podUrl: v.optional(v.string()),
    podSecret: v.optional(v.string()),
    podStatus: v.optional(v.union(
      v.literal("provisioning"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("error")
    )),
    telegramChatId: v.optional(v.string()),
    // Per-agent Telegram bot integration
    telegramBotToken: v.optional(v.string()),    // encrypted
    telegramBotUsername: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_telegram_chat_id", ["telegramChatId"]),

  // DEPRECATED — kept for migration compatibility, no longer used
  telegramLinks: defineTable({
    agentId: v.id("agents"),
    clerkUserId: v.string(),
    chatId: v.optional(v.string()),
    linkedAt: v.optional(v.number()),
    linkCode: v.string(),
    createdAt: v.number(),
  }).index("by_link_code", ["linkCode"])
    .index("by_agent", ["agentId"])
    .index("by_chat_id", ["chatId"]),

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
    source: v.optional(v.union(v.literal("web"), v.literal("telegram"))),
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

  // Agent activity feed
  activities: defineTable({
    userId: v.id("users"),
    agentId: v.id("agents"),
    type: v.union(
      v.literal("heartbeat_complete"),
      v.literal("task_complete"),
      v.literal("task_failed"),
      v.literal("chat_response"),
      v.literal("proactive_action"),
      v.literal("error")
    ),
    summary: v.string(),
    metadata: v.optional(v.object({
      taskId: v.optional(v.string()),
      messageId: v.optional(v.string()),
      error: v.optional(v.string()),
      tokensUsed: v.optional(v.number()),
    })),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_user_time", ["userId", "createdAt"]),

  // ─── GTM Lead Sourcing ───────────────────────────────────

  // GTM campaigns (a campaign = a goal + team of agents)
  campaigns: defineTable({
    sessionId: v.string(),              // Anonymous session (no auth required)
    userId: v.optional(v.id("users")),  // Optional: linked if user is logged in
    name: v.string(),
    goal: v.string(),                   // Free-text GTM goal / ICP description
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    totalLeads: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  // Leads found by agents
  leads: defineTable({
    campaignId: v.id("campaigns"),
    agentId: v.optional(v.id("agents")),  // Which agent found this lead
    sessionId: v.string(),
    name: v.string(),
    title: v.optional(v.string()),
    company: v.string(),
    website: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    email: v.optional(v.string()),
    score: v.number(),                    // 0-100 ICP fit score
    reason: v.string(),                   // One-line score explanation
    source: v.optional(v.string()),       // URL where found
    enrichmentData: v.optional(v.string()), // JSON: company size, funding, tech stack
    status: v.union(
      v.literal("new"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("exported")
    ),
    foundAt: v.number(),
    reviewedAt: v.optional(v.number()),
  }).index("by_campaign", ["campaignId"])
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"]),

  // Artifacts produced by agents (reports, analyses, email drafts)
  artifacts: defineTable({
    campaignId: v.id("campaigns"),
    agentId: v.optional(v.id("agents")),
    sessionId: v.string(),
    title: v.string(),
    content: v.string(),                  // Markdown content
    type: v.union(
      v.literal("report"),
      v.literal("email_draft"),
      v.literal("analysis"),
      v.literal("strategy"),
      v.literal("other")
    ),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_session", ["sessionId"]),

  // Org chart node positions (persisted layout)
  orgNodePositions: defineTable({
    userId: v.id("users"),
    // "founder" for the user node, or agent._id for agents
    nodeKey: v.string(),
    x: v.number(),
    y: v.number(),
  }).index("by_user", ["userId"]),
});
