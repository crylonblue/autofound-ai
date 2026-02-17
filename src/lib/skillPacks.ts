export const SKILL_PACKS = {
  "web-research": {
    name: "Web Research",
    description: "Search the web and fetch page content",
    icon: "🔍",
  },
  "communication": {
    name: "Team Communication",
    description: "Send messages to other agents in your organization",
    icon: "💬",
  },
  "file-management": {
    name: "File Management",
    description: "Read, write, and manage files in persistent workspace storage",
    icon: "📁",
  },
} as const;

export type SkillPackKey = keyof typeof SKILL_PACKS;
export const ALL_SKILL_KEYS = Object.keys(SKILL_PACKS) as SkillPackKey[];
export const DEFAULT_SKILLS: SkillPackKey[] = ["web-research", "file-management"];
