"use client"

import * as React from "react"
import Image from "next/image"
import { Check, Loader2, Copy, CheckCheck, ArrowRight, Briefcase, MessageSquareText, User } from "lucide-react"
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
import { useWaitlistFlow } from "@/hooks/useWaitlistFlow"

interface WaitlistDialogProps {
  trigger?: React.ReactNode
  className?: string
}

export function WaitlistDialog({ trigger, className }: WaitlistDialogProps) {
  const [open, setOpen] = React.useState(false)
  const {
    step,
    email,
    name,
    picture,
    googleLoading,
    role,
    useCase,
    loading,
    error,
    position,
    referralCode,
    copied,
    setRole,
    setUseCase,
    handleGoogleAuth,
    handleSubmit,
    copyReferralLink,
    resetForm,
    goToEmailStep,
    checkOAuthCallback,
    isValid,
  } = useWaitlistFlow()

  // Check for OAuth callback data on mount
  React.useEffect(() => {
    const shouldOpen = checkOAuthCallback()
    if (shouldOpen) {
      setOpen(true)
    }
  }, [checkOAuthCallback])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen && step !== "success") resetForm()
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
        {/* Success Step */}
        {step === "success" && (
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
        )}

        {/* Email Step (Google only) */}
        {step === "email" && (
          <>
            <DialogHeader>
              <DialogTitle>Join the Waitlist</DialogTitle>
              <DialogDescription>
                Get early access to ADAgent. Sign in with Google to get started.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Google Sign In Button */}
              <Button
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                variant="outline"
                className="w-full h-11 gap-3"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                Use &quot;Sign in with another account&quot; in Google to switch accounts
              </p>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Survey Step */}
        {step === "survey" && (
          <>
            <DialogHeader>
              <DialogTitle>Almost there!</DialogTitle>
              <DialogDescription>
                Tell us a bit about yourself so we can prioritize your access.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              {/* User Info Section */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                {/* Avatar */}
                {picture ? (
                  <Image
                    src={picture}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="rounded-full border border-border shrink-0"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {name && (
                    <p className="text-sm font-medium truncate">{name}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    You can update your name in settings after joining
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={goToEmailStep}
                  className="h-8 px-2 text-xs text-muted-foreground shrink-0"
                >
                  Change
                </Button>
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
