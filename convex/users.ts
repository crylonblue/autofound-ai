import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

export const createOrGetUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
  },
});

export const updateApiKey = mutation({
  args: {
    clerkId: v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    const apiKeys = user.apiKeys ?? {};
    await ctx.db.patch(user._id, {
      apiKeys: { ...apiKeys, [args.provider]: args.key },
    });
  },
});

export const deleteApiKey = mutation({
  args: {
    clerkId: v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    const apiKeys = user.apiKeys ?? {};
    await ctx.db.patch(user._id, {
      apiKeys: { ...apiKeys, [args.provider]: undefined },
    });
  },
});

export const getApiKeys = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;
    const apiKeys = user.apiKeys ?? {};
    const masks = user.apiKeyMasks ?? {};
    return {
      openai: apiKeys.openai ? (masks.openai ?? "••••••") : null,
      anthropic: apiKeys.anthropic ? (masks.anthropic ?? "••••••") : null,
      google: apiKeys.google ? (masks.google ?? "••••••") : null,
    };
  },
});

// Internal: store encrypted key (called from crypto action)
export const storeEncryptedKey = internalMutation({
  args: {
    clerkId: v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
    encryptedKey: v.string(),
    maskedKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    const apiKeys = user.apiKeys ?? {};
    const apiKeyMasks = user.apiKeyMasks ?? {};
    await ctx.db.patch(user._id, {
      apiKeys: { ...apiKeys, [args.provider]: args.encryptedKey },
      apiKeyMasks: { ...apiKeyMasks, [args.provider]: args.maskedKey },
    });
  },
});

// Internal: get encrypted key (called from crypto action for decryption)
export const getEncryptedKey = internalQuery({
  args: {
    clerkId: v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;
    return (user.apiKeys ?? {})[args.provider] ?? null;
  },
});

export const dismissOnboarding = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { onboardingDismissed: true });
  },
});

export const getOnboardingState = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;

    const hasApiKeys = !!(user.apiKeys?.openai || user.apiKeys?.anthropic || user.apiKeys?.google);

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const hasAgents = agents.length > 0;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const hasTasks = !!tasks;

    return {
      dismissed: user.onboardingDismissed ?? false,
      hasApiKeys,
      hasAgents,
      hasTasks,
      allComplete: hasApiKeys && hasAgents && hasTasks,
    };
  },
});

export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      clerkId: u.clerkId,
      email: u.email,
      hasAnthropicKey: !!u.apiKeys?.anthropic,
      anthropicKeyPrefix: u.apiKeys?.anthropic?.slice(0, 20),
      mask: u.apiKeyMasks?.anthropic,
    }));
  },
});
