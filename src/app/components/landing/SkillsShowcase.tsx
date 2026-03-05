import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const skillCards = [
  {
    icon: "🔍",
    name: "Web Research",
    description: "Search the web and fetch page content for analysis.",
    tools: ["web_search", "fetch_url", "extract_content"],
    example: "Research competitors and summarize their pricing pages.",
    accent: "hover:border-emerald-500/40",
  },
  {
    icon: "💬",
    name: "Communication",
    description: "Send messages to other agents in your organization.",
    tools: ["send_message", "notify_agent", "request_approval"],
    example: "Notify the ops agent when a deployment completes.",
    accent: "hover:border-blue-500/40",
  },
  {
    icon: "📁",
    name: "File Management",
    description: "Read, write, and manage files in persistent workspace storage.",
    tools: ["read_file", "write_file", "list_files"],
    example: "Save research findings to a structured report file.",
    accent: "hover:border-amber-500/40",
  },
  {
    icon: "🧠",
    name: "Memory",
    description: "Read and write persistent memory that survives across sessions.",
    tools: ["memory_read", "memory_write", "memory_search"],
    example: "Remember user preferences and past interactions.",
    accent: "hover:border-purple-500/40",
  },
  {
    icon: "🖥️",
    name: "Code Execution",
    description: "Execute JavaScript code for calculations and data processing.",
    tools: ["execute_js", "eval_expression"],
    example: "Calculate ROI from a spreadsheet of financial data.",
    accent: "hover:border-pink-500/40",
  },
  {
    icon: "🐳",
    name: "Pod Compute",
    description: "Execute shell commands and manage files on a persistent Linux pod.",
    tools: ["shell_exec", "pod_upload", "pod_download"],
    example: "Run a Python script to train a model on your data.",
    accent: "hover:border-cyan-500/40",
  },
];

export default function SkillsShowcase() {
  return (
    <section id="skills" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Modular skill packs
        </h2>
        <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
          Snap in capabilities your agents need. Each skill pack comes with
          tools, permissions, and sandboxed execution.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillCards.map((skill) => (
            <Card
              key={skill.name}
              className={`bg-white/[0.02] border-white/5 transition ${skill.accent}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{skill.icon}</span>
                  <h3 className="font-semibold text-white">{skill.name}</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {skill.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {skill.tools.map((tool) => (
                    <Badge
                      key={tool}
                      variant="outline"
                      className="font-mono text-xs text-zinc-500 border-white/10 bg-white/[0.02]"
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-xs text-zinc-600 italic">
                  {skill.example}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-dashed border-white/10 text-sm text-zinc-500">
            <span className="text-blue-400">+</span>
            Coming soon: Custom skills &mdash; bring your own tools and APIs
          </div>
        </div>
      </div>
    </section>
  );
}
