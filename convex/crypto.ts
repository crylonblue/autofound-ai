"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable not set");
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
}

export function decrypt(blob: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, ciphertext] = blob.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function maskKey(key: string): string {
  if (key.length <= 7) return "••••••";
  return key.slice(0, 3) + "••••" + key.slice(-4);
}

// Save an API key (encrypts before storing)
export const saveEncryptedKey = action({
  args: {
    clerkId: v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const encrypted = encrypt(args.key);
    const masked = maskKey(args.key);
    await ctx.runMutation(internal.users.storeEncryptedKey, {
      clerkId: args.clerkId,
      provider: args.provider,
      encryptedKey: encrypted,
      maskedKey: masked,
    });
  },
});

// Get a decrypted key (for agent task execution)
export const getDecryptedKey = action({
  args: {
    clerkId: v.string(),
    provider: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const encrypted: string | null = await ctx.runQuery(internal.users.getEncryptedKey, {
      clerkId: args.clerkId,
      provider: args.provider,
    });
    if (!encrypted) return null;
    return decrypt(encrypted);
  },
});
