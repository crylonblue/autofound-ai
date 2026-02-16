"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });
}

const bucket = () => process.env.R2_BUCKET!;

export const readFile = action({
  args: { clerkId: v.string(), key: v.string() },
  handler: async (_ctx, { clerkId, key }) => {
    const client = getR2Client();
    const fullKey = `${clerkId}/${key}`;
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket(), Key: fullKey })
      );
      return (await res.Body?.transformToString("utf-8")) ?? null;
    } catch (e: any) {
      if (e.name === "NoSuchKey") return null;
      throw e;
    }
  },
});

export const writeFile = action({
  args: { clerkId: v.string(), key: v.string(), content: v.string() },
  handler: async (_ctx, { clerkId, key, content }) => {
    const client = getR2Client();
    const fullKey = `${clerkId}/${key}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: fullKey,
        Body: content,
        ContentType: "text/markdown; charset=utf-8",
      })
    );
    return { success: true, key: fullKey };
  },
});

export const listFiles = action({
  args: { clerkId: v.string(), prefix: v.string() },
  handler: async (_ctx, { clerkId, prefix }) => {
    const client = getR2Client();
    const fullPrefix = `${clerkId}/${prefix}`;
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: fullPrefix })
    );
    return (
      res.Contents?.map((obj) => ({
        key: obj.Key?.replace(`${clerkId}/`, "") ?? "",
        size: obj.Size ?? 0,
        lastModified: obj.LastModified?.toISOString() ?? null,
      })) ?? []
    );
  },
});

export const deleteFile = action({
  args: { clerkId: v.string(), key: v.string() },
  handler: async (_ctx, { clerkId, key }) => {
    const client = getR2Client();
    const fullKey = `${clerkId}/${key}`;
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: fullKey })
    );
    return { success: true, key: fullKey };
  },
});

// Initialize R2 files for a newly created agent
export const initAgentFiles = action({
  args: {
    clerkId: v.string(),
    agentId: v.string(),
    agentName: v.string(),
    systemPrompt: v.string(),
  },
  handler: async (_ctx, { clerkId, agentId, agentName, systemPrompt }) => {
    const client = getR2Client();
    const base = `${clerkId}/agents/${agentId}`;

    await Promise.all([
      client.send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: `${base}/SOUL.md`,
          Body: systemPrompt,
          ContentType: "text/markdown; charset=utf-8",
        })
      ),
      client.send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: `${base}/MEMORY.md`,
          Body: `# Memory\n\nLong-term memories for ${agentName}.\n`,
          ContentType: "text/markdown; charset=utf-8",
        })
      ),
    ]);

    return { success: true, base };
  },
});
