import { cacheLife } from "next/cache"
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

export default async function LandingPage() {
  "use cache"
  cacheLife("hours")

  return (
    <div className="flex flex-col">
      {/* Hero - Main value proposition (client component, handles own auth) */}
      <HeroSection />

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
