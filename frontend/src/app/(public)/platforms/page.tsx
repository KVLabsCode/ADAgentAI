import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const platforms = [
  {
    name: "AdMob",
    letter: "A",
    gradient: "from-green-500 to-green-600",
    description: "Google's mobile advertising platform for app monetization.",
    status: "available",
    features: [
      "Revenue and earnings reports",
      "Ad unit performance metrics",
      "eCPM and fill rate analytics",
      "App-level breakdowns",
    ],
  },
  {
    name: "Google Ad Manager",
    letter: "G",
    gradient: "from-blue-500 to-blue-600",
    description: "Enterprise ad serving platform for publishers.",
    status: "coming-soon",
    features: [
      "Line item performance",
      "Inventory forecasting",
      "Yield analytics",
      "Network-level reports",
    ],
  },
  {
    name: "Unity Ads",
    letter: "U",
    gradient: "from-zinc-600 to-zinc-800",
    description: "Gaming-focused mobile ad platform.",
    status: "coming-soon",
    features: [
      "Revenue tracking",
      "Ad placement analytics",
      "ARPDAU metrics",
      "Cohort analysis",
    ],
  },
  {
    name: "AppLovin MAX",
    letter: "M",
    gradient: "from-orange-500 to-red-500",
    description: "Mediation platform for mobile ad optimization.",
    status: "coming-soon",
    features: [
      "Waterfall analytics",
      "Bidding performance",
      "Network comparison",
      "A/B test results",
    ],
  },
]

export default function PlatformsPage() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Supported Platforms
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect your ad platforms and start getting AI-powered insights instantly.
          </p>
        </div>

        {/* Platform Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {platforms.map((platform) => (
            <Card key={platform.name} className="relative overflow-hidden">
              {platform.status === "coming-soon" && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <Badge variant="secondary" className="text-sm">
                    Coming Soon
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className={`h-12 w-12 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-white font-bold text-lg shrink-0`}
                  >
                    {platform.letter}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {platform.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {platform.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center mt-12 space-y-4">
          <p className="text-muted-foreground">
            Need a platform that&apos;s not listed? Let us know!
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">Request a Platform</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
