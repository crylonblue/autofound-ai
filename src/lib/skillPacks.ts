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
  "memory": {
    name: "Memory",
    description: "Read and write persistent memory that survives across chat sessions",
    icon: "🧠",
  },
  "code-execution": {
    name: "Code Execution",
    description: "Execute JavaScript code for calculations and data processing",
    icon: "🖥️",
  },
} as const;

export type SkillPackKey = keyof typeof SKILL_PACKS;
export const ALL_SKILL_KEYS = Object.keys(SKILL_PACKS) as SkillPackKey[];
export const DEFAULT_SKILLS: SkillPackKey[] = ["web-research", "file-management", "memory"];
