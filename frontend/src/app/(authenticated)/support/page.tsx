"use client"

import * as React from "react"
import Link from "next/link"
import { HelpCircle, MessageCircle, Book, FileText, ExternalLink, Mail } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

export default function SupportPage() {
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-muted-foreground">
          Get help with ADAgent or contact our team.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Book className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              Documentation
            </CardTitle>
            <CardDescription>
              Learn how to use ADAgent effectively.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="group cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              API Reference
            </CardTitle>
            <CardDescription>
              Technical documentation for developers.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="group cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              Community
            </CardTitle>
            <CardDescription>
              Join our Discord community.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">How do I connect my AdMob account?</h4>
            <p className="text-sm text-muted-foreground">
              Go to Connected Providers, click "Connect Provider", and select AdMob. You'll be redirected to Google to authorize access.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">What data does ADAgent access?</h4>
            <p className="text-sm text-muted-foreground">
              ADAgent only accesses read-only data from your ad platforms, including performance metrics and ad unit configurations. We never modify your account settings.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Can I use multiple ad platforms?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! Pro and Enterprise plans support unlimited provider connections. The Free plan supports one provider.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Is my data secure?</h4>
            <p className="text-sm text-muted-foreground">
              Absolutely. We use industry-standard encryption and never store your ad platform credentials. All connections use OAuth 2.0.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Contact Us
          </CardTitle>
          <CardDescription>
            Can't find what you're looking for? Send us a message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-medium mb-1">Message sent!</h3>
                <p className="text-sm text-muted-foreground">
                  We'll get back to you within 24 hours.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="What can we help you with?" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Describe your issue or question in detail..."
                  className="min-h-[120px] resize-none"
                  required
                />
              </div>
              <Button type="submit">Send Message</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
