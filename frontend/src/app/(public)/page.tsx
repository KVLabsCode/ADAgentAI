"use client"

import Link from "next/link"
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WaitlistDialog } from "@/components/waitlist-dialog"
import { AdMobLogo, ProviderLogoBadge } from "@/components/icons/provider-logos"
import { useUser } from "@/hooks/use-user"

export default function LandingPage() {
  const { isAuthenticated } = useUser()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            {/* Early Access Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-muted/50 text-xs">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Early Access</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              AI-powered ad platform management
            </h1>

            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Connect your AdMob account or join the waitlist for
              Google Ad Manager support. Ask questions in plain English.
            </p>

            {/* CTA - Show waitlist for non-authenticated, dashboard link for authenticated */}
            {isAuthenticated ? (
              <Button asChild size="sm" className="h-9">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <WaitlistDialog />
                <p className="text-[11px] text-muted-foreground">
                  Free during early access. No credit card required.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-medium">Natural Language</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask questions like &quot;What was my revenue yesterday?&quot; and get instant answers.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-medium">Real-time Data</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connected directly to your ad platforms for up-to-date insights.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-medium">Secure Access</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Read-only OAuth. Your credentials are never stored.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-16 border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-center text-muted-foreground mb-6">Supported Platforms</p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2.5">
                <AdMobLogo />
                <span className="text-sm font-medium">AdMob</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ProviderLogoBadge type="gam" disabled />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Google Ad Manager</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          {isAuthenticated ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Ready to get started?
              </p>
              <Button asChild size="sm" className="h-8 text-xs">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Already have an invite?
              </p>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href="/login">
                  Sign in with Google
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
