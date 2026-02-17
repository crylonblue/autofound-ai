import { ToolDefinition } from "./types";
import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Factory that creates a send_message_to_agent tool bound to the current context.
 * The tool lets one agent delegate to another agent by name.
 */
export function createSendMessageToAgentTool(
  ctx: ActionCtx,
  clerkId: string,
  callingAgentId: Id<"agents">,
  depth: number
): ToolDefinition {
  return {
    name: "send_message_to_agent",
    description:
      "Send a message to another agent in your organization and get their response. Use this to delegate tasks or get specialized input from agents with different expertise.",
    parameters: {
      type: "object",
      properties: {
        agent_name: {
          type: "string",
          description: "Name of the target agent (case-insensitive)",
        },
        message: {
          type: "string",
          description: "The message to send to the target agent",
        },
      },
      required: ["agent_name", "message"],
    },
    execute: async (args: { agent_name: string; message: string }) => {
      if (depth >= 3) {
        return "Error: Maximum agent-to-agent depth (3) reached. Cannot delegate further.";
      }

      // Look up target agent by name
      const agents = await ctx.runQuery(api.agents.listAgentsByClerk, { clerkId });
      const target = agents.find(
        (a) => a.name.toLowerCase() === args.agent_name.toLowerCase()
      );

      if (!target) {
        const available = agents
          .filter((a) => a._id !== callingAgentId)
          .map((a) => a.name)
          .join(", ");
        return `Error: Agent "${args.agent_name}" not found. Available agents: ${available || "none"}`;
      }

      if (target._id === callingAgentId) {
        return "Error: An agent cannot send a message to itself.";
      }

      if (target.status !== "active") {
        return `Error: Agent "${target.name}" is not active (status: ${target.status}).`;
      }

      try {
        const response: string = await ctx.runAction(api.chatRunner.agentToAgentChat, {
          callingAgentId,
          targetAgentId: target._id,
          clerkId,
          message: args.message,
          depth: depth + 1,
        });
        return response;
      } catch (err: any) {
        return `Error communicating with agent "${target.name}": ${err.message}`;
      }
    },
  };
}
