import { ToolDefinition } from "./types";
import { webSearch } from "./webSearch";
import { webFetch } from "./webFetch";
import { createSendMessageToAgentTool } from "./sendMessageToAgent";
import { ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/** Static tools that don't need runtime context */
export const allTools: Record<string, ToolDefinition> = {
  web_search: webSearch,
  web_fetch: webFetch,
};

/**
 * Get enabled tools for an agent. If context is provided, includes
 * context-dependent tools like send_message_to_agent.
 */
export function getEnabledTools(
  toolNames?: string[],
  runtimeCtx?: {
    ctx: ActionCtx;
    clerkId: string;
    agentId: Id<"agents">;
    depth: number;
  }
): ToolDefinition[] {
  if (!toolNames || toolNames.length === 0) return [];

  // Build dynamic tools map including context-dependent ones
  const available: Record<string, ToolDefinition> = { ...allTools };

  if (runtimeCtx) {
    const agentTool = createSendMessageToAgentTool(
      runtimeCtx.ctx,
      runtimeCtx.clerkId,
      runtimeCtx.agentId,
      runtimeCtx.depth
    );
    available[agentTool.name] = agentTool;
  }

  return toolNames
    .filter((name) => name in available)
    .map((name) => available[name]);
}

/** Execute a tool by name. For context-dependent tools, pass the full tools list. */
export async function executeToolFromList(
  name: string,
  args: any,
  tools: ToolDefinition[]
): Promise<string> {
  const tool = tools.find((t) => t.name === name) || allTools[name];
  if (!tool) return `Error: Unknown tool "${name}"`;
  try {
    return await tool.execute(args);
  } catch (err: any) {
    return `Error executing ${name}: ${err.message}`;
  }
}
