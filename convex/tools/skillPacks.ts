export const SKILL_PACKS = {
  "web-research": {
    name: "Web Research",
    description: "Search the web and fetch page content",
    icon: "🔍",
    tools: ["web_search", "web_fetch"],
  },
  "communication": {
    name: "Team Communication",
    description: "Send messages to other agents in your organization",
    icon: "💬",
    tools: ["send_message_to_agent"],
  },
  "file-management": {
    name: "File Management",
    description: "Read, write, and manage files in persistent workspace storage",
    icon: "📁",
    tools: ["read_file", "write_file", "list_files", "delete_file"],
  },
} as const;

export type SkillPackKey = keyof typeof SKILL_PACKS;

/** Given skill pack keys, return flat list of tool names */
export function getToolNamesFromSkills(skillKeys: string[]): string[] {
  const toolNames = new Set<string>();
  for (const key of skillKeys) {
    const pack = SKILL_PACKS[key as SkillPackKey];
    if (pack) {
      for (const tool of pack.tools) {
        toolNames.add(tool);
      }
    }
  }
  return Array.from(toolNames);
}

/** Get all tool names across all skill packs */
export function getAllToolNames(): string[] {
  return getToolNamesFromSkills(Object.keys(SKILL_PACKS));
}
