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
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Support</h1>
        <p className="text-xs text-muted-foreground/80">
          Get help with ADAgentAI or contact our team.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="#"
          className="group rounded border border-border/30 px-3 py-2.5 hover:border-border/50 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
              <Book className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-medium group-hover:text-primary transition-colors">Documentation</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Learn how to use ADAgentAI effectively.
          </p>
        </Link>

        <Link
          href="#"
          className="group rounded border border-border/30 px-3 py-2.5 hover:border-border/50 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
              <FileText className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-medium group-hover:text-primary transition-colors">API Reference</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Technical documentation for developers.
          </p>
        </Link>

        <Link
          href="#"
          className="group rounded border border-border/30 px-3 py-2.5 hover:border-border/50 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-medium group-hover:text-primary transition-colors">Community</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Join our Discord community.
          </p>
        </Link>
      </div>

      {/* FAQ */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Frequently Asked Questions</h2>
            <p className="text-[10px] text-muted-foreground/60">Common questions about ADAgentAI.</p>
          </div>
        </div>
        <div className="px-3 py-2 divide-y divide-border/20">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Contact Us</h2>
            <p className="text-[10px] text-muted-foreground/60">Can&apos;t find what you&apos;re looking for? Send us a message.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs font-medium mb-0.5">Message sent!</p>
              <p className="text-[10px] text-muted-foreground/60">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium block mb-1">Subject</label>
                <Input
                  placeholder="What can we help you with?"
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1">Message</label>
                <Textarea
                  placeholder="Describe your issue or question..."
                  className="min-h-[80px] resize-none text-xs"
                  required
                />
              </div>
              <Button type="submit" size="sm" className="h-7 text-xs">
                <Send className="h-3 w-3 mr-1.5" />
                Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
