import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does Bring Your Own Key (BYOK) work?",
    a: "You connect your own AI provider API keys (OpenAI, Anthropic, Google AI, etc.). Your keys are encrypted at rest and never logged. All usage flows directly between your agents and the AI provider — we never see your prompts or outputs.",
  },
  {
    q: "What are skills and how do they work?",
    a: "Skills are modular tool packs that give your agents capabilities — web research, file management, code execution, pod compute, and more. Each skill comes with sandboxed permissions and tools. Snap them in when creating an agent, remove them anytime.",
  },
  {
    q: "What is the heartbeat feature?",
    a: "Heartbeat lets agents wake up on a schedule (every 30 minutes, hourly, etc.) to do proactive work without being prompted — monitoring dashboards, checking for updates, sending reports, or following up on tasks.",
  },
  {
    q: "How does isolated execution work?",
    a: "Every agent run spins up a fresh, ephemeral container on Fly.io. There's no shared state between runs unless you explicitly use the Memory or File Management skills. This means maximum security and zero cross-contamination.",
  },
  {
    q: "Can agents communicate with each other?",
    a: "Yes. Agents with the Communication skill can send messages, delegate tasks, request approvals, and escalate issues to other agents in your organization.",
  },
  {
    q: "What AI models are supported?",
    a: "Any model accessible via API — OpenAI (GPT-4o, o1, o3), Anthropic (Claude Opus, Sonnet, Haiku), Google (Gemini), and more. With BYOK, you choose the model per agent.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Frequently asked questions
        </h2>
        <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
          Everything you need to know about autofound.ai
        </p>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-white/5 rounded-xl px-6 data-[state=open]:border-white/10"
            >
              <AccordionTrigger className="text-white hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
