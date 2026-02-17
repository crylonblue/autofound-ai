import { ToolDefinition } from "./types";
import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Factory to create file access tools bound to a specific user + agent context.
 * Files are stored in Cloudflare R2 under {clerkId}/agents/{agentId}/
 */
export function createFileTools(
  ctx: ActionCtx,
  clerkId: string,
  agentId: string
): ToolDefinition[] {
  const basePath = `agents/${agentId}`;

  return [
    {
      name: "read_file",
      description:
        "Read the contents of a file from your workspace. Use this to read your memory, notes, or any files you've saved. Files are persisted across conversations.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Relative file path within your workspace, e.g. "MEMORY.md", "notes/research.md", "data/report.txt"',
          },
        },
        required: ["path"],
      },
      execute: async (args: { path: string }) => {
        try {
          const content = await (ctx as any).runAction(api.r2.readFile, {
            clerkId,
            key: `${basePath}/${args.path}`,
          });
          if (content === null) {
            return `File not found: ${args.path}`;
          }
          return content;
        } catch (e: any) {
          return `Error reading file: ${e.message}`;
        }
      },
    },
    {
      name: "write_file",
      description:
        "Write content to a file in your workspace. Creates the file if it doesn't exist, overwrites if it does. Use this to save notes, memory, research results, or any data you want to persist.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Relative file path, e.g. "MEMORY.md", "notes/meeting-2026-02-17.md"',
          },
          content: {
            type: "string",
            description: "The content to write to the file",
          },
        },
        required: ["path", "content"],
      },
      execute: async (args: { path: string; content: string }) => {
        try {
          await (ctx as any).runAction(api.r2.writeFile, {
            clerkId,
            key: `${basePath}/${args.path}`,
            content: args.content,
          });
          return `Successfully wrote ${args.content.length} chars to ${args.path}`;
        } catch (e: any) {
          return `Error writing file: ${e.message}`;
        }
      },
    },
    {
      name: "list_files",
      description:
        "List files in your workspace directory. Shows file names, sizes, and last modified dates.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Directory path to list, e.g. "" for root, "notes/" for notes folder. Default: root.',
          },
        },
        required: [],
      },
      execute: async (args: { path?: string }) => {
        try {
          const prefix = args.path
            ? `${basePath}/${args.path}`
            : `${basePath}/`;
          const files = await (ctx as any).runAction(api.r2.listFiles, {
            clerkId,
            prefix,
          });
          if (!files || files.length === 0) {
            return "No files found in this directory.";
          }
          // Strip the base path prefix for cleaner display
          const stripPrefix = `${basePath}/`;
          return files
            .map(
              (f: any) =>
                `${f.key.replace(stripPrefix, "")} (${f.size} bytes, ${f.lastModified || "unknown"})`
            )
            .join("\n");
        } catch (e: any) {
          return `Error listing files: ${e.message}`;
        }
      },
    },
    {
      name: "delete_file",
      description: "Delete a file from your workspace.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path to delete",
          },
        },
        required: ["path"],
      },
      execute: async (args: { path: string }) => {
        try {
          await (ctx as any).runAction(api.r2.deleteFile, {
            clerkId,
            key: `${basePath}/${args.path}`,
          });
          return `Deleted ${args.path}`;
        } catch (e: any) {
          return `Error deleting file: ${e.message}`;
        }
      },
    },
  ];
}
