"use client"

import * as React from "react"
import { Check, Loader2, Copy, CheckCheck, ArrowRight, Briefcase, MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { GmailEmailInput, GMAIL_DOMAINS, getFullEmail } from "@/components/ui/gmail-email-input"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface WaitlistDialogProps {
  trigger?: React.ReactNode
  className?: string
}

export function WaitlistDialog({ trigger, className }: WaitlistDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [emailUsername, setEmailUsername] = React.useState("")
  const [emailDomain, setEmailDomain] = React.useState(GMAIL_DOMAINS[0].id)
  const [role, setRole] = React.useState("")
  const [useCase, setUseCase] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [position, setPosition] = React.useState<number | null>(null)
  const [referralCode, setReferralCode] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailUsername || !role || !useCase) return

    const email = getFullEmail(emailUsername, emailDomain)
    setLoading(true)
    setError("")

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const refCode = urlParams.get("ref")

      const response = await fetch(`${API_URL}/api/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          referralCode: refCode || undefined,
          role,
          useCase,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        setPosition(data.position)
        setReferralCode(data.referralCode)
      } else {
        setError(data.error || "Failed to join waitlist")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setEmailUsername("")
    setEmailDomain(GMAIL_DOMAINS[0].id)
    setRole("")
    setUseCase("")
    setSubmitted(false)
    setError("")
    setPosition(null)
    setReferralCode("")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen && !submitted) resetForm()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className={cn("h-9", className)}>
            Join Waitlist
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <VisuallyHidden.Root>
              <DialogTitle>Waitlist Confirmation</DialogTitle>
            </VisuallyHidden.Root>
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">You&apos;re in!</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll reach out when it&apos;s your turn.
              </p>
              {position && (
                <p className="text-sm font-medium pt-2">
                  Position <span className="text-emerald-500">#{position}</span> in line
                </p>
              )}
            </div>

            {referralCode && (
              <div className="pt-4 space-y-3">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                  <p className="text-xs font-medium">Share to move up the list</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-background px-3 py-2 rounded border truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `?ref=${referralCode}`}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0"
                      onClick={copyReferralLink}
                    >
                      {copied ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Each referral moves you up 3 spots
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join the Waitlist</DialogTitle>
              <DialogDescription>
                Get early access to ADAgent. Tell us a bit about yourself so we can prioritize your access.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Gmail Address <span className="text-destructive">*</span>
                </Label>
                <GmailEmailInput
                  value={emailUsername}
                  onChange={setEmailUsername}
                  domain={emailDomain}
                  onDomainChange={setEmailDomain}
                  disabled={loading}
                  placeholder="your.email"
                />
                <p className="text-[11px] text-muted-foreground">
                  We use Google Sign-In for authentication
                </p>
              </div>

              {/* Survey Section */}
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary">
                    <Briefcase className="h-3 w-3" />
                  </span>
                  Quick Survey
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm">
                    What best describes you? <span className="text-destructive">*</span>
                  </Label>
                  <Select value={role} onValueChange={setRole} disabled={loading} required>
                    <SelectTrigger id="role" className="bg-background">
                      <SelectValue placeholder="Select your role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publisher">App Publisher</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="marketer">Marketer / Ad Ops</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="indie">Indie Developer</SelectItem>
                      <SelectItem value="enterprise">Enterprise / Large Publisher</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Use Case */}
                <div className="space-y-2">
                  <Label htmlFor="useCase" className="text-sm flex items-center gap-1.5">
                    <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                    What would you use ADAgent for? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="useCase"
                    placeholder="e.g., I want to quickly check my daily revenue across multiple apps without logging into each dashboard..."
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="min-h-[80px] resize-none bg-background"
                    required
                    disabled={loading}
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {useCase.length}/500
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !emailUsername || !role || !useCase}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
