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
} as const;

export type SkillPackKey = keyof typeof SKILL_PACKS;
export const ALL_SKILL_KEYS = Object.keys(SKILL_PACKS) as SkillPackKey[];
export const DEFAULT_SKILLS: SkillPackKey[] = ["web-research"];
