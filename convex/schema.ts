import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles (synced from Clerk)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    apiKeys: v.optional(v.object({
      openai: v.optional(v.string()),
      anthropic: v.optional(v.string()),
      google: v.optional(v.string()),
    })),
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

  // Org chart connections
  orgConnections: defineTable({
    userId: v.id("users"),
    parentAgentId: v.id("agents"),
    childAgentId: v.id("agents"),
  }).index("by_user", ["userId"]),
});
