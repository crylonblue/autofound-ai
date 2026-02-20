// Cost per 1M tokens: [input, output]
const MODEL_COSTS: Record<string, [number, number]> = {
  // Anthropic
  "claude-sonnet-4-20250514": [3, 15],
  "claude-4-sonnet-20250514": [3, 15],
  "claude-opus-4-6": [15, 75],
  // OpenAI
  "gpt-4o-mini": [2.5, 10],
  "gpt-4o": [2.5, 10],
  // Google
  "gemini-2.5-flash": [1.25, 5],
  "gemini-2.5-pro": [1.25, 5],
  "gemini-1.5-flash": [1.25, 5],
  "gemini-2.0-flash": [1.25, 5],
};

// Fallback by provider
const PROVIDER_COSTS: Record<string, [number, number]> = {
  anthropic: [3, 15],
  openai: [2.5, 10],
  google: [1.25, 5],
};

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model?: string,
  provider?: string
): number {
  const costs =
    (model && MODEL_COSTS[model]) ||
    (provider && PROVIDER_COSTS[provider]) ||
    [3, 15]; // default to Sonnet pricing

  return (inputTokens * costs[0] + outputTokens * costs[1]) / 1_000_000;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(2)}`;
}
