"use client"

import * as React from "react"
import { Loader2, FileText, Shield, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"

interface TosModalProps {
  open: boolean
}

export function TosModal({ open }: TosModalProps) {
  const { acceptTos, user } = useUser()
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [agreedToTerms, setAgreedToTerms] = React.useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = React.useState(false)
  const [marketingOptIn, setMarketingOptIn] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canAccept = agreedToTerms && agreedToPrivacy

  const handleAccept = async () => {
    if (!canAccept) return

    setIsAccepting(true)
    setError(null)

    try {
      const success = await acceptTos(marketingOptIn)
      if (!success) {
        setError("Failed to accept terms. Please try again.")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[500px] [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="mx-auto rounded-full bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">
            Welcome to ADAgentAI
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Before you continue, please review and accept our terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Terms of Service */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
              agreedToTerms ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"
            )}
            onClick={() => setAgreedToTerms(!agreedToTerms)}
          >
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                Terms of Service
              </label>
              <p className="text-xs text-muted-foreground">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>
                {" "}and understand how ADAgentAI processes my data.
              </p>
            </div>
          </div>

          {/* Privacy Policy */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
              agreedToPrivacy ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"
            )}
            onClick={() => setAgreedToPrivacy(!agreedToPrivacy)}
          >
            <Checkbox
              id="privacy"
              checked={agreedToPrivacy}
              onCheckedChange={(checked) => setAgreedToPrivacy(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="privacy" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Privacy Policy
              </label>
              <p className="text-xs text-muted-foreground">
                I have read and agree to the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>

          {/* Marketing opt-in (optional) */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
              marketingOptIn ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border/80"
            )}
            onClick={() => setMarketingOptIn(!marketingOptIn)}
          >
            <Checkbox
              id="marketing"
              checked={marketingOptIn}
              onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="marketing" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Product Updates
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Keep me updated about new features, tips, and product improvements.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleAccept}
            disabled={!canAccept || isAccepting}
            className="w-full"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "Continue to ADAgentAI"
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            Signed in as {user?.email}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
