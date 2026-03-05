"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Do I need to know how to code?",
    a: "Not at all. You interact with your agents using plain English — just describe what you need done. There's no coding, no configuration files, and no technical setup required.",
  },
  {
    q: "Is my data safe?",
    a: "Absolutely. All data is encrypted at rest and in transit. Every agent runs in an isolated, secure environment. We follow industry-standard security practices and never share your data with third parties.",
  },
  {
    q: "How fast can I get started?",
    a: "You can have your first agent working in under 60 seconds. Sign up, describe your task, and your agent starts immediately. No onboarding calls, no training period.",
  },
  {
    q: "What can the agents actually do?",
    a: "Your agents can handle content creation, sales outreach, lead research, competitive analysis, data entry, report generation, customer support, and much more. If it can be done on a computer, an agent can probably help.",
  },
  {
    q: "Will agents take actions without my approval?",
    a: "You're always in control. You can set up approval workflows so agents check with you before taking important actions. You decide the level of autonomy for each agent.",
  },
  {
    q: "What happens if I hit my agent limit?",
    a: "You can upgrade your plan at any time to add more agents. Your existing agents and their work history are preserved when you upgrade.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel or downgrade your plan at any time. There are no long-term contracts or cancellation fees. We also offer a 14-day money-back guarantee.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Frequently asked <span className="text-gradient">questions</span>
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Everything you need to know about getting started.
          </p>
        </div>
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
