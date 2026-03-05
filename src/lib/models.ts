export const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" },
  { value: "claude-opus-4-6", label: "Claude Opus 4", provider: "anthropic" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google" },
] as const;

export type ModelValue = (typeof MODELS)[number]["value"];
