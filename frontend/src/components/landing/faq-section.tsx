"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "Is my data safe?",
    a: "We use Google's secure OAuth with read-only permissions. Your credentials are never stored. Your ad data stays with Google; we query APIs in real-time.",
  },
  {
    q: "Can the AI make unauthorized changes?",
    a: "No. All create, update, and delete operations require your explicit approval. You review every action before it runs.",
  },
  {
    q: "What can I ask ADAgentAI?",
    a: "Revenue reports, eCPM analysis, mediation performance, A/B testing, inventory management, waterfall optimization—and much more across 20+ API endpoints.",
  },
  {
    q: "Which ad networks are supported?",
    a: "We support 10+ networks including AppLovin, Unity Ads, ironSource, Facebook, Vungle, Chartboost, AdSense, and more.",
  },
  {
    q: "Can I manage multiple accounts?",
    a: "Yes. Connect multiple publisher accounts and switch between them seamlessly.",
  },
  {
    q: "What platforms are supported?",
    a: "AdMob is fully available now. Google Ad Manager is coming soon. Meta Ads and other networks are on the roadmap.",
  },
  {
    q: "Is ADAgentAI free?",
    a: "Yes, during early access. No credit card required.",
  },
  {
    q: "Can my team use it together?",
    a: "Organization support is launching soon. Create organizations today, team features coming shortly.",
  },
]

export function FAQSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">
              FAQ
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-tight">
              Common questions
            </h2>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((item, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="border-b border-border/30 last:border-0"
              >
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-4 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Contact hint */}
          <p className="text-center text-xs text-muted-foreground/50 mt-12">
            Still have questions?
            <br />
            <a href="mailto:support@adagentai.com" className="text-foreground hover:underline">
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
