import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("growth"), v.literal("business"), v.literal("enterprise")),
    apiKeys: v.optional(v.object({
      openai: v.optional(v.string()),
      anthropic: v.optional(v.string()),
      google: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  companies: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("archived")),
    settings: v.object({
      defaultModel: v.string(),
      approvalMode: v.union(v.literal("all"), v.literal("external"), v.literal("none")),
      timezone: v.string(),
    }),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  agents: defineTable({
    companyId: v.id("companies"),
    templateId: v.optional(v.string()),
    name: v.string(),
    role: v.string(),
    department: v.string(),
    avatar: v.optional(v.string()),
    systemPrompt: v.string(),
    model: v.string(),
    tools: v.array(v.string()),
    managerId: v.optional(v.id("agents")),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("terminated")),
    position: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
    stats: v.object({
      tasksCompleted: v.number(),
      messagesHandled: v.number(),
      tokensUsed: v.number(),
      lastActive: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_manager", ["managerId"]),

  orgConnections: defineTable({
    companyId: v.id("companies"),
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
    type: v.union(v.literal("reports_to"), v.literal("peers"), v.literal("cross_dept"), v.literal("broadcast")),
  })
    .index("by_company", ["companyId"])
    .index("by_from", ["fromAgentId"])
    .index("by_to", ["toAgentId"]),

  messages: defineTable({
    companyId: v.id("companies"),
    fromAgentId: v.optional(v.id("agents")),
    fromFounder: v.optional(v.boolean()),
    toAgentId: v.optional(v.id("agents")),
    toFounder: v.optional(v.boolean()),
    content: v.string(),
    type: v.union(v.literal("task"), v.literal("report"), v.literal("question"), v.literal("escalation"), v.literal("info")),
    taskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_time", ["companyId", "createdAt"]),

  tasks: defineTable({
    companyId: v.id("companies"),
    title: v.string(),
    description: v.string(),
    assignedTo: v.id("agents"),
    assignedBy: v.optional(v.id("agents")),
    assignedByFounder: v.optional(v.boolean()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("needs_approval"),
      v.literal("completed"),
      v.literal("failed")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent")),
    output: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_assigned", ["assignedTo"])
    .index("by_company_status", ["companyId", "status"]),

  templates: defineTable({
    slug: v.string(),
    name: v.string(),
    role: v.string(),
    department: v.string(),
    systemPrompt: v.string(),
    suggestedTools: v.array(v.string()),
    suggestedConnections: v.array(v.string()),
    icon: v.string(),
    color: v.string(),
    isOfficial: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_department", ["department"]),

  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"]),
});
