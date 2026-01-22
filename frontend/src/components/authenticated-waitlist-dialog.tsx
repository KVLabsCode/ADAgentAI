"use client"

import * as React from "react"
import { Check, Copy, CheckCheck, Briefcase, MessageSquareText } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { Textarea } from "@/atoms/textarea"
import { Label } from "@/atoms/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/molecules/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import { cn } from "@/lib/utils"
import { useAuthenticatedWaitlistForm } from "@/hooks/useAuthenticatedWaitlistForm"

interface AuthenticatedWaitlistDialogProps {
  email: string
  trigger?: React.ReactNode
  className?: string
  onSuccess?: () => void
}

export function AuthenticatedWaitlistDialog({
  email,
  trigger,
  className,
  onSuccess
}: AuthenticatedWaitlistDialogProps) {
  const [open, setOpen] = React.useState(false)
  const {
    role,
    useCase,
    submitted,
    loading,
    error,
    position,
    referralCode,
    copied,
    setRole,
    setUseCase,
    handleSubmit,
    copyReferralLink,
    resetForm,
    isValid,
  } = useAuthenticatedWaitlistForm({ email, onSuccess })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen && !submitted) resetForm()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={cn(className)}>
            Join Waitlist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <VisuallyHidden.Root>
              <DialogTitle>Waitlist Confirmation</DialogTitle>
            </VisuallyHidden.Root>
            <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-success" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">You&apos;re in!</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll reach out when it&apos;s your turn.
              </p>
              {position && (
                <p className="text-sm font-medium pt-2">
                  Position <span className="text-success">#{position}</span> in line
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
              {/* Email Display (read-only for authenticated users) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm text-muted-foreground">
                  {email}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Using your signed-in account
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
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
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
