"use client"

import * as React from "react"
import Image from "next/image"
import { Check, Copy, CheckCheck, ArrowRight, User } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/molecules/dialog"
import { VisuallyHidden } from "@/atoms/visually-hidden"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
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
    <Dialog open={open} modal={false} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen && step !== "success") resetForm()
    }}>
      <DialogTrigger
        render={React.isValidElement(trigger) ? trigger : (
          <button className={cn(
            "h-9 px-4 flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium",
            "bg-[#f7f8f8] text-[#08090a] hover:bg-white transition-colors duration-100",
            className
          )}>
            Join Waitlist
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      />
      {/* Linear-style dialog content */}
      <DialogContent className="sm:max-w-[450px] p-0 gap-0 bg-[#08090a] border-[0.8px] border-white/[0.05] rounded-lg overflow-hidden">
        {/* Success Step - Linear style */}
        {step === "success" && (
          <div className="py-12 px-6 flex flex-col items-center text-center space-y-4">
            <VisuallyHidden>
              <DialogTitle>Waitlist Confirmation</DialogTitle>
            </VisuallyHidden>
            {/* Muted gray checkmark - Linear style */}
            <div className="mx-auto w-8 h-8 flex items-center justify-center">
              <Check className="h-8 w-8 text-white/40" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-[16px] font-medium text-[#f7f8f8]">You&apos;re on the list</h3>
              <p className="text-[16px] text-white/60">
                We&apos;ll reach out when it&apos;s your turn.
              </p>
              {position && (
                <p className="text-[14px] text-white/60 pt-2">
                  Position <span className="text-[#f7f8f8] font-medium">#{position}</span> in line
                </p>
              )}
            </div>

            {referralCode && (
              <div className="pt-6 space-y-3 w-full max-w-sm">
                <div className="p-4 rounded-lg bg-white/[0.03] border-[0.8px] border-white/[0.05] space-y-3">
                  <p className="text-[13px] font-medium text-[#f7f8f8]">Share to move up the list</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[13px] font-mono bg-white/[0.05] text-[#b4bcd0] px-3 py-2 rounded-md border-[0.8px] border-white/[0.05] truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `?ref=${referralCode}`}
                    </code>
                    <button
                      onClick={copyReferralLink}
                      className="h-9 w-9 flex items-center justify-center rounded-md bg-[#28282c] border-[0.8px] border-[#3e3e44] text-[#f7f8f8] hover:bg-[#323236] transition-colors duration-100"
                    >
                      {copied ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[13px] text-white/40">
                  Each referral moves you up 3 spots
                </p>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="mt-4 h-8 px-4 rounded-lg text-[13px] font-medium bg-[#28282c] border-[0.8px] border-[#3e3e44] text-[#f7f8f8] hover:bg-[#323236] transition-colors duration-100"
            >
              Done
            </button>
          </div>
        )}

        {/* Email Step - Linear style */}
        {step === "email" && (
          <>
            {/* Title with bottom border - Linear style */}
            <div className="px-5 py-4 border-b-[0.8px] border-white/[0.05]">
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-[16px] font-normal text-[#f7f8f8]">Join the Waitlist</DialogTitle>
                <VisuallyHidden>
                  <DialogDescription>Get early access to ADAgent</DialogDescription>
                </VisuallyHidden>
              </DialogHeader>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[14px] text-white/60">
                Get early access to ADAgent. Sign in with Google to get started.
              </p>

              {/* Google Sign In Button - Linear style */}
              <button
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="w-full h-10 flex items-center justify-center gap-3 rounded-lg text-[14px] font-medium bg-white/[0.05] border-[0.8px] border-white/[0.05] text-[#f7f8f8] hover:bg-white/[0.08] disabled:opacity-50 transition-colors duration-100"
              >
                {googleLoading ? (
                  <Spinner size="sm" />
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
              </button>

              <p className="text-[13px] text-center text-white/40">
                Use &quot;Sign in with another account&quot; in Google to switch accounts
              </p>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border-[0.8px] border-red-500/20">
                  <p className="text-[14px] text-red-400">{error}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Survey Step - Linear style */}
        {step === "survey" && (
          <>
            {/* Title with bottom border - Linear style */}
            <div className="px-5 py-4 border-b-[0.8px] border-white/[0.05]">
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-[16px] font-normal text-[#f7f8f8]">Almost there!</DialogTitle>
                <VisuallyHidden>
                  <DialogDescription>Tell us about yourself</DialogDescription>
                </VisuallyHidden>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* User Info Section - Linear style */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border-[0.8px] border-white/[0.05]">
                {/* Avatar */}
                {picture ? (
                  <Image
                    src={picture}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full border-[0.8px] border-white/[0.08] shrink-0"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-white/60" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {name && (
                    <p className="text-[14px] font-medium text-[#f7f8f8] truncate">{name}</p>
                  )}
                  <p className="text-[13px] text-white/60 truncate">{email}</p>
                </div>

                <button
                  type="button"
                  onClick={goToEmailStep}
                  className="h-7 px-2.5 text-[12px] text-white/60 hover:text-[#f7f8f8] hover:bg-white/[0.05] rounded-md transition-colors duration-100 shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Survey Section - Linear style */}
              <div className="space-y-4">
                <p className="text-[14px] text-white/60">
                  Tell us a bit about yourself so we can prioritize your access.
                </p>

                {/* Role Selection */}
                <div className="space-y-2.5">
                  <label htmlFor="role" className="block text-[13px] text-[#f7f8f8]">
                    What best describes you? <span className="text-red-400">*</span>
                  </label>
                  <Select value={role} onValueChange={setRole} disabled={loading} required>
                    <SelectTrigger
                      id="role"
                      className="h-10 bg-white/[0.05] border-[0.8px] border-white/[0.05] rounded-lg text-[14px] text-[#f7f8f8] focus:ring-0 focus:border-white/[0.15]"
                    >
                      <SelectValue placeholder="Select your role..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c1c1f] border-[0.8px] border-white/[0.08]">
                      <SelectItem value="publisher" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">App Publisher</SelectItem>
                      <SelectItem value="developer" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">Developer</SelectItem>
                      <SelectItem value="marketer" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">Marketer / Ad Ops</SelectItem>
                      <SelectItem value="agency" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">Agency</SelectItem>
                      <SelectItem value="indie" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">Indie Developer</SelectItem>
                      <SelectItem value="enterprise" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">Enterprise / Large Publisher</SelectItem>
                      <SelectItem value="other" className="text-[#b4bcd0] focus:bg-white/[0.05] focus:text-[#f7f8f8]">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Use Case */}
                <div className="space-y-2.5">
                  <label htmlFor="useCase" className="block text-[13px] text-[#f7f8f8]">
                    What would you use ADAgent for? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="useCase"
                    placeholder="e.g., Check daily revenue, optimize waterfalls..."
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="w-full min-h-[100px] px-3 py-2.5 rounded-lg text-[14px] text-[#f7f8f8] placeholder:text-white/40 bg-white/[0.05] border-[0.8px] border-white/[0.05] focus:border-white/[0.15] focus:outline-none resize-none transition-colors duration-100"
                    required
                    disabled={loading}
                    maxLength={500}
                  />
                  <p className="text-[12px] text-white/40 text-right">
                    {useCase.length}/500
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border-[0.8px] border-red-500/20">
                  <p className="text-[14px] text-red-400">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="h-8 px-3 rounded-lg text-[13px] font-medium text-white/60 hover:text-[#f7f8f8] hover:bg-white/[0.05] disabled:opacity-50 transition-colors duration-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !isValid}
                  className="h-8 px-4 rounded-lg text-[13px] font-medium bg-[#28282c] border-[0.8px] border-[#3e3e44] text-[#f7f8f8] hover:bg-[#323236] disabled:opacity-50 transition-colors duration-100"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Joining...
                    </span>
                  ) : (
                    "Join Waitlist"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
