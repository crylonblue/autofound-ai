import { ToolDefinition } from "./types";

export const codeExecute: ToolDefinition = {
  name: "code_execute",
  description:
    "Execute JavaScript/Node.js code in a sandboxed environment. Use for calculations, data processing, text manipulation, or any computation. Has access to standard JS built-ins. Console.log output is captured and returned.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "JavaScript code to execute. Use console.log() for output.",
      },
      language: {
        type: "string",
        description:
          "Programming language (currently only 'javascript' supported)",
        enum: ["javascript"],
      },
    },
    required: ["code"],
  },
  execute: async (args: { code: string; language?: string }) => {
    try {
      // Dynamic import to avoid Convex bundler issues with Node built-ins
      const vm = await import("node:vm");

      const logs: string[] = [];
      const sandbox = {
        console: {
          log: (...a: any[]) => logs.push(a.map(String).join(" ")),
          error: (...a: any[]) =>
            logs.push("ERROR: " + a.map(String).join(" ")),
          warn: (...a: any[]) =>
            logs.push("WARN: " + a.map(String).join(" ")),
        },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        Promise,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        fetch: globalThis.fetch,
        setTimeout: undefined,
        setInterval: undefined,
      };

      const context = vm.createContext(sandbox);
      const script = new vm.Script(args.code, { timeout: 10000 });
      const result = script.runInContext(context, { timeout: 10000 });

      const output = logs.length > 0 ? logs.join("\n") : "";
      const resultStr = result !== undefined ? String(result) : "";

      return [output, resultStr].filter(Boolean).join("\n") || "(no output)";
    } catch (e: any) {
      return `Execution error: ${e.message}`;
    }
  },
};
