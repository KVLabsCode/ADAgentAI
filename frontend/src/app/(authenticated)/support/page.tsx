"use client"

import * as React from "react"
import { MessageCircle, ChevronDown, Send } from "lucide-react"
import { Button } from "@/atoms/button"
import { Textarea } from "@/atoms/textarea"
import { Input } from "@/atoms/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  ConfigFieldGroup,
} from "@/organisms/theme"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "How do I connect my AdMob account?",
    answer: "Go to Connected Providers, click \"Connect Provider\", and select AdMob. You'll be redirected to Google to authorize access."
  },
  {
    question: "What data does ADAgentAI access?",
    answer: "ADAgentAI only accesses read-only data from your ad platforms, including performance metrics and ad unit configurations. We never modify your account settings."
  },
  {
    question: "Can I use multiple ad platforms?",
    answer: "Yes! Pro and Enterprise plans support unlimited provider connections. The Free plan supports one provider."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use industry-standard encryption and never store your ad platform credentials. All connections use OAuth 2.0."
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-[var(--item-padding-x)] py-3 text-left hover:bg-muted/30 transition-colors">
        <span className="text-[length:var(--text-label)] leading-[var(--line-height-label)] font-[var(--font-weight-medium)]">{question}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground/50 transition-transform duration-200 shrink-0 ml-4",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-[var(--item-padding-x)] pb-4 pt-1">
          <p className="text-[length:var(--text-description)] leading-relaxed text-[color:var(--text-color-description)]">
            {answer}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function SupportPage() {
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Support"
        description="Get help with ADAgentAI or contact our team."
      />

      {/* Sections with consistent 48px gap */}
      <div className="flex flex-col gap-[var(--section-gap)]">
        {/* FAQ */}
        <SettingsSection title="Frequently Asked Questions">
          <ConfigFieldGroup>
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </ConfigFieldGroup>
        </SettingsSection>

        {/* Contact Form */}
        <SettingsSection title="Contact Us">
          <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center mb-3">
                  <MessageCircle className="h-5 w-5 text-success" />
                </div>
                <p className="text-[length:var(--text-label)] leading-[var(--line-height-label)] font-[var(--font-weight-medium)] mb-1">Message sent!</p>
                <p className="text-[length:var(--text-description)] leading-[var(--line-height-description)] text-[color:var(--text-color-description)]">
                  We&apos;ll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[length:var(--text-label)] leading-[var(--line-height-label)] font-[var(--font-weight-medium)] block mb-2">Subject</label>
                  <Input
                    placeholder="What can we help you with?"
                    required
                  />
                </div>
                <div>
                  <label className="text-[length:var(--text-label)] leading-[var(--line-height-label)] font-[var(--font-weight-medium)] block mb-2">Message</label>
                  <Textarea
                    placeholder="Describe your issue or question..."
                    className="min-h-[100px] resize-none"
                    required
                  />
                </div>
                <Button type="submit" size="sm">
                  <Send className="h-3.5 w-3.5" />
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </SettingsSection>
      </div>
    </PageContainer>
  )
}
