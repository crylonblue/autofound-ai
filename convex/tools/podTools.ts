import { ToolDefinition } from "./types";

/**
 * Create pod-aware tools that route shell_exec and file operations
 * through the agent's persistent Fly Machine pod.
 */
export function createPodTools(
  podUrl: string,
  podSecret: string
): ToolDefinition[] {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${podSecret}`,
  };

  return [
    {
      name: "shell_exec",
      description:
        "Execute a shell command on your persistent compute pod. The pod has a full Linux environment with persistent storage. Use for running code, installing packages, processing data, etc.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to execute",
          },
          timeout: {
            type: "number",
            description: "Timeout in seconds (default: 30)",
          },
        },
        required: ["command"],
      },
      execute: async (args: { command: string; timeout?: number }) => {
        try {
          const res = await fetch(`${podUrl}/exec`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              command: args.command,
              timeout: args.timeout || 30,
            }),
          });
          if (!res.ok) {
            const err = await res.text();
            return `Error (${res.status}): ${err}`;
          }
          const data = await res.json();
          return data.output || data.stdout || "(no output)";
        } catch (e: any) {
          return `Pod connection error: ${e.message}`;
        }
      },
    },
    {
      name: "pod_file_read",
      description:
        "Read a file from the pod's persistent filesystem.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute or relative file path on the pod",
          },
        },
        required: ["path"],
      },
      execute: async (args: { path: string }) => {
        try {
          const res = await fetch(`${podUrl}/files/read`, {
            method: "POST",
            headers,
            body: JSON.stringify({ path: args.path }),
          });
          if (!res.ok) {
            const err = await res.text();
            return `Error (${res.status}): ${err}`;
          }
          const data = await res.json();
          return data.content ?? "(empty file)";
        } catch (e: any) {
          return `Pod connection error: ${e.message}`;
        }
      },
    },
    {
      name: "pod_file_write",
      description:
        "Write content to a file on the pod's persistent filesystem.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute or relative file path on the pod",
          },
          content: {
            type: "string",
            description: "Content to write",
          },
        },
        required: ["path", "content"],
      },
      execute: async (args: { path: string; content: string }) => {
        try {
          const res = await fetch(`${podUrl}/files/write`, {
            method: "POST",
            headers,
            body: JSON.stringify({ path: args.path, content: args.content }),
          });
          if (!res.ok) {
            const err = await res.text();
            return `Error (${res.status}): ${err}`;
          }
          return `Written ${args.content.length} chars to ${args.path}`;
        } catch (e: any) {
          return `Pod connection error: ${e.message}`;
        }
      },
    },
  ];
}
