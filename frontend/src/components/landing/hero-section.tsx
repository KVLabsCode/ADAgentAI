"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WaitlistDialog } from "@/components/waitlist-dialog"

interface HeroSectionProps {
  isAuthenticated: boolean
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Early Access Badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/40 text-[10px] tracking-wide uppercase mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-muted-foreground">Early Access</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight leading-[1.15] mb-5">
            AI agents for your AD ops
          </h1>

          {/* Description */}
          <div className="text-muted-foreground text-sm md:text-base mb-8 space-y-1">
            <p>Skip the dashboards. Let agents handle reports, mediation, and tests.</p>
            <p className="text-muted-foreground/70">You focus on strategy.</p>
          </div>

          {/* Agent types */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <span className="px-3 py-1.5 rounded-full border border-border/40 font-mono text-[11px] text-muted-foreground tracking-wide">
              reporting
            </span>
            <span className="px-3 py-1.5 rounded-full border border-border/40 font-mono text-[11px] text-muted-foreground tracking-wide">
              inventory
            </span>
            <span className="px-3 py-1.5 rounded-full border border-border/40 font-mono text-[11px] text-muted-foreground tracking-wide">
              mediation
            </span>
            <span className="px-3 py-1.5 rounded-full border border-border/40 font-mono text-[11px] text-muted-foreground tracking-wide">
              optimization
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            {isAuthenticated ? (
              <Button asChild size="lg" className="h-10 px-6 text-sm rounded-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <WaitlistDialog
                  trigger={
                    <Button size="lg" className="h-10 px-6 text-sm rounded-full bg-foreground text-background hover:bg-foreground/90">
                      Join the Waitlist
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  }
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Free during early access
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
