import { ToolDefinition } from "./types";
import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Memory-specific tools for agents. These provide a focused interface
 * for reading/writing persistent memory (MEMORY.md and daily logs).
 */
export function createMemoryTools(
  ctx: ActionCtx,
  clerkId: string,
  agentId: string
): ToolDefinition[] {
  const basePath = `agents/${agentId}`;

  return [
    {
      name: "memory_read",
      description:
        "Read your long-term memory (MEMORY.md) or a specific daily log. " +
        "Use this to recall what you've learned across sessions.",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description:
              'Which memory file to read. "MEMORY.md" for long-term memory, ' +
              'or "memory/YYYY-MM-DD.md" for a specific day\'s log. Default: "MEMORY.md"',
          },
        },
        required: [],
      },
      execute: async (args: { file?: string }) => {
        const file = args.file || "MEMORY.md";
        try {
          const content = await (ctx as any).runAction(api.r2.readFile, {
            clerkId,
            key: `${basePath}/${file}`,
          });
          if (content === null) {
            return file === "MEMORY.md"
              ? "Memory is empty. Use memory_write to save important information."
              : `No log found for ${file}`;
          }
          return content;
        } catch (e: any) {
          return `Error reading memory: ${e.message}`;
        }
      },
    },
    {
      name: "memory_write",
      description:
        "Write to your long-term memory (MEMORY.md) or append to today's daily log. " +
        "Use this to persist important information, decisions, and learnings across sessions. " +
        "For daily logs, content is appended rather than overwritten.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to write or append",
          },
          file: {
            type: "string",
            description:
              '"MEMORY.md" to overwrite long-term memory, or "memory/YYYY-MM-DD.md" ' +
              "for a daily log (will append). Default: MEMORY.md",
          },
        },
        required: ["content"],
      },
      execute: async (args: { content: string; file?: string }) => {
        const file = args.file || "MEMORY.md";
        const key = `${basePath}/${file}`;
        try {
          // For daily logs, append instead of overwrite
          if (file.startsWith("memory/")) {
            let existing = "";
            try {
              const current = await (ctx as any).runAction(api.r2.readFile, {
                clerkId,
                key,
              });
              if (current) existing = current;
            } catch {
              // File doesn't exist yet, that's fine
            }
            const timestamp = new Date().toISOString().slice(11, 19);
            const newContent = existing
              ? `${existing}\n\n## ${timestamp}\n${args.content}`
              : `# Daily Log - ${file.replace("memory/", "").replace(".md", "")}\n\n## ${timestamp}\n${args.content}`;
            await (ctx as any).runAction(api.r2.writeFile, {
              clerkId,
              key,
              content: newContent,
            });
            return `Appended to ${file} (${args.content.length} chars)`;
          }

          // For MEMORY.md, overwrite
          await (ctx as any).runAction(api.r2.writeFile, {
            clerkId,
            key,
            content: args.content,
          });
          return `Updated ${file} (${args.content.length} chars)`;
        } catch (e: any) {
          return `Error writing memory: ${e.message}`;
        }
      },
    },
  ];
}
