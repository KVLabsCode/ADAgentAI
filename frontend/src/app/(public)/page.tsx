"use client"

import {
  HeroSection,
  HowItWorksSection,
  ExampleQueriesSection,
  FeaturesSection,
  SecuritySection,
  TeamSection,
  PlatformsSection,
  FAQSection,
} from "@/components/landing"
import { useUser } from "@/hooks/use-user"

export default function LandingPage() {
  const { isAuthenticated } = useUser()

  return (
    <div className="flex flex-col">
      {/* Hero - Main value proposition */}
      <HeroSection isAuthenticated={isAuthenticated} />

      {/* Platforms - Connect your ad platforms (moved to top) */}
      <PlatformsSection />

      {/* How It Works - 3-step flow */}
      <HowItWorksSection />

      {/* Example Queries - Show capabilities by category */}
      <ExampleQueriesSection />

      {/* Features - Detailed feature grid */}
      <FeaturesSection />

      {/* Security - Trust building with smart approval UI mockup */}
      <SecuritySection />

      {/* Team Collaboration */}
      <TeamSection />

      {/* FAQ - Common questions */}
      <FAQSection />
    </div>
  )
}
