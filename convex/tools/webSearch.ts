import { ToolDefinition } from "./types";

const TAVILY_API_KEY = "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";

export const webSearch: ToolDefinition = {
  name: "web_search",
  description:
    "Search the web for current information. Use this when you need up-to-date facts, news, or information you don't have.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results (default 5)",
      },
    },
    required: ["query"],
  },
  execute: async (args: { query: string; max_results?: number }) => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: args.query,
        max_results: args.max_results || 5,
        include_answer: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`Tavily search failed: ${res.status}`);
    }
    const data = await res.json();
    let output = "";
    if (data.answer) {
      output += `Answer: ${data.answer}\n\n`;
    }
    if (data.results) {
      for (const r of data.results) {
        output += `**${r.title}**\n${r.url}\n${r.content?.slice(0, 200) || ""}\n\n`;
      }
    }
    return output.trim() || "No results found.";
  },
};
