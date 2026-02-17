import { ToolDefinition } from "./types";
import { webSearch } from "./webSearch";
import { webFetch } from "./webFetch";

export const allTools: Record<string, ToolDefinition> = {
  web_search: webSearch,
  web_fetch: webFetch,
};

export function getEnabledTools(toolNames?: string[]): ToolDefinition[] {
  if (!toolNames || toolNames.length === 0) return [];
  return toolNames
    .filter((name) => name in allTools)
    .map((name) => allTools[name]);
}
