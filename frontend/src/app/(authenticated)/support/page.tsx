"use client"

import * as React from "react"
import Link from "next/link"
import { HelpCircle, MessageCircle, Book, FileText, Mail, ChevronDown, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
} from "@/components/ui/theme"
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
      <CollapsibleTrigger className="w-full flex items-center justify-between py-2.5 text-left hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
        <span className="text-xs font-medium">{question}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pb-2 pl-0.5">
          {answer}
        </p>
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

      {/* Quick Links */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="#"
          className="group rounded border border-border/30 p-4 hover:border-foreground/20 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
              <Book className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium group-hover:text-foreground transition-colors">Documentation</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Learn how to use ADAgentAI effectively.
          </p>
        </Link>

        <Link
          href="#"
          className="group rounded border border-border/30 p-4 hover:border-foreground/20 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium group-hover:text-foreground transition-colors">API Reference</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Technical documentation for developers.
          </p>
        </Link>

        <Link
          href="#"
          className="group rounded border border-border/30 p-4 hover:border-foreground/20 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium group-hover:text-foreground transition-colors">Community</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Join our Discord community.
          </p>
        </Link>
      </div>

      {/* FAQ */}
      <SectionCard>
        <SectionCardHeader
          icon={HelpCircle}
          title="Frequently Asked Questions"
          description="Common questions about ADAgentAI."
        />
        <SectionCardContent padded={false}>
          <div className="px-4 py-2 divide-y divide-border/30">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>

      {/* Contact Form */}
      <SectionCard>
        <SectionCardHeader
          icon={Mail}
          title="Contact Us"
          description="Can't find what you're looking for? Send us a message."
        />
        <SectionCardContent>
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <MessageCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium mb-1">Message sent!</p>
              <p className="text-xs text-muted-foreground">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5">Subject</label>
                <Input
                  placeholder="What can we help you with?"
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Message</label>
                <Textarea
                  placeholder="Describe your issue or question..."
                  className="min-h-[100px] resize-none text-xs"
                  required
                />
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs">
                <Send className="h-3 w-3 mr-1.5" />
                Send Message
              </Button>
            </form>
          )}
        </SectionCardContent>
      </SectionCard>
    </PageContainer>
  )
}
