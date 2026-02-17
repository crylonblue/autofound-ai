import { ToolDefinition } from "./types";

export const webFetch: ToolDefinition = {
  name: "web_fetch",
  description:
    "Fetch and read the content of a web page. Use this to get detailed information from a specific URL.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch",
      },
    },
    required: ["url"],
  },
  execute: async (args: { url: string }) => {
    const res = await fetch(args.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AutofoundBot/1.0)",
      },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    // Strip HTML tags
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3000);
  },
};
