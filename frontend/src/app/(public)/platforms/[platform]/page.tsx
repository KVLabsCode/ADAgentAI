"use client"

import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ArrowLeft, Zap, Layers } from "lucide-react"

// Types
type AdSource = {
  id: string
  name: string
  logo?: string
  logoLight?: string
  logoDark?: string
  supportsBidding: boolean
  supportsWaterfall: boolean
  status: "available" | "coming-soon"
}

type MediationPlatform = {
  id: string
  name: string
  logo?: string
  logoLight?: string
  logoDark?: string
  description: string
  subtitle: string
  status: "available" | "coming-soon"
  adSources: AdSource[]
}

// Theme-aware logo component
function ThemeAwareLogo({ logoLight, logoDark, alt, size = 48 }: {
  logoLight: string
  logoDark: string
  alt: string
  size?: number
}) {
  return (
    <>
      <Image
        src={logoLight}
        alt={alt}
        width={size}
        height={size}
        className="object-contain dark:hidden"
      />
      <Image
        src={logoDark}
        alt={alt}
        width={size}
        height={size}
        className="object-contain hidden dark:block"
      />
    </>
  )
}

// Platform data (same as main page)
const platformsData: Record<string, MediationPlatform> = {
  admob: {
    id: "admob",
    name: "Google AdMob",
    logo: "/logos/admob.svg",
    description: "Google's mobile advertising platform with built-in mediation supporting 48 ad networks.",
    subtitle: "Mobile app monetization with 40+ ad network integrations",
    status: "available",
    adSources: [
      { id: "meta", name: "Meta Audience Network", logo: "/logos/meta.svg", supportsBidding: true, supportsWaterfall: false, status: "available" },
      { id: "applovin", name: "AppLovin", logo: "/logos/applovin.svg", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "unity", name: "Unity Ads", logoLight: "/logos/unity.svg", logoDark: "/logos/unity-light.svg", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "liftoff", name: "Liftoff Monetize", logoLight: "/logos/liftoff.svg", logoDark: "/logos/liftoff-light.svg", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "inmobi", name: "InMobi", logo: "/logos/inmobi.svg", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "mintegral", name: "Mintegral", logo: "/logos/mintegral.png", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "pangle", name: "Pangle", logo: "/logos/pangle.svg", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "dtexchange", name: "DT Exchange", logo: "/logos/dtexchange.svg", supportsBidding: true, supportsWaterfall: true, status: "available" },
      { id: "ironsource", name: "ironSource Ads", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "chartboost", name: "Chartboost", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "moloco", name: "Moloco", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "line", name: "LINE Ads", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "maio", name: "Maio", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "imobile", name: "i-mobile", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "mytarget", name: "myTarget", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "pubmatic-openwrap", name: "PubMatic OpenWrap", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "vpon", name: "Vpon", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "zucks", name: "Zucks", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "adgeneration", name: "Ad Generation", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "chocolate", name: "Chocolate Platform", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "equativ", name: "Equativ", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "fluct", name: "Fluct", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "improvedigital", name: "Improve Digital", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "indexexchange", name: "Index Exchange", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "inmobiexchange", name: "InMobi Exchange", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "magnite", name: "Magnite DV+", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "medianet", name: "Media.net", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "mobfox", name: "MobFox", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "nexxen", name: "Nexxen", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "onetag", name: "OneTag Exchange", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "openx", name: "OpenX", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "pubmatic", name: "PubMatic", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "rise", name: "Rise", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "sharethrough", name: "Sharethrough", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "smaato", name: "Smaato", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "sonobi", name: "Sonobi", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "triplelift", name: "TripleLift", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "verve", name: "Verve Group", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "yieldmo", name: "Yieldmo", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "yieldone", name: "YieldOne", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
    ],
  },
  gam: {
    id: "gam",
    name: "Google Ad Manager",
    logo: "/logos/google-ad-manager.svg",
    description: "Enterprise ad serving platform with 30+ Open Bidding partners and programmatic demand.",
    subtitle: "Enterprise ad serving with 30+ Open Bidding partners",
    status: "available",
    adSources: [
      { id: "adx", name: "Google Ad Exchange", logo: "/logos/admob.svg", supportsBidding: true, supportsWaterfall: false, status: "available" },
      { id: "amazon", name: "Amazon TAM/UAM", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "openx", name: "OpenX", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "indexexchange", name: "Index Exchange", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "pubmatic", name: "PubMatic", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "magnite", name: "Magnite (Rubicon)", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "xandr", name: "Xandr (Microsoft)", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "criteo", name: "Criteo", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "verizon", name: "Verizon Media", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "spotx", name: "SpotX", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "smaato", name: "Smaato", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "triplelift", name: "TripleLift", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "sharethrough", name: "Sharethrough", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "inmobi", name: "InMobi", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "sonobi", name: "Sonobi", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "gumgum", name: "GumGum", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "medianet", name: "Media.net", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "emxdigital", name: "EMX Digital", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "equativ", name: "Equativ (SAS)", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "33across", name: "33Across", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "adswizz", name: "AdsWizz", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "between", name: "Between", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "nativery", name: "Nativery", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "onebyaol", name: "One by AOL", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "primis", name: "Primis", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "rise", name: "Rise", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "seedtag", name: "Seedtag", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "teads", name: "Teads", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "unruly", name: "Unruly", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "viant", name: "Viant", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
      { id: "yahoossp", name: "Yahoo SSP", supportsBidding: true, supportsWaterfall: false, status: "coming-soon" },
    ],
  },
  levelplay: {
    id: "levelplay",
    name: "Unity LevelPlay",
    logoLight: "/logos/unity.svg",
    logoDark: "/logos/unity-light.svg",
    description: "ironSource's mediation platform with 29 ad networks and unified auction.",
    subtitle: "Unified auction mediation with 29 ad networks",
    status: "coming-soon",
    adSources: [
      { id: "admob", name: "Google AdMob", logo: "/logos/admob.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "meta", name: "Meta Audience Network", logo: "/logos/meta.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "unity", name: "Unity Ads", logoLight: "/logos/unity.svg", logoDark: "/logos/unity-light.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "applovin", name: "AppLovin", logo: "/logos/applovin.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "pangle", name: "Pangle", logo: "/logos/pangle.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "mintegral", name: "Mintegral", logo: "/logos/mintegral.png", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "inmobi", name: "InMobi", logo: "/logos/inmobi.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "liftoff", name: "Liftoff Monetize", logoLight: "/logos/liftoff.svg", logoDark: "/logos/liftoff-light.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "chartboost", name: "Chartboost", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "vungle", name: "Vungle", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "dtexchange", name: "DT Exchange", logo: "/logos/dtexchange.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "ironsource", name: "ironSource Ads", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "amazon", name: "Amazon", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "yahoo", name: "Yahoo", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "adcolony", name: "AdColony", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "tapjoy", name: "Tapjoy", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "fyber", name: "Fyber", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "hyprmx", name: "HyprMX", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "maio", name: "Maio", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "mopub", name: "MoPub", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "snap", name: "Snap", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "tencent", name: "Tencent", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "superawesome", name: "SuperAwesome", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "smaato", name: "Smaato", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "yandex", name: "Yandex", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "moloco", name: "Moloco", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "bidmachine", name: "BidMachine", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "ogury", name: "Ogury", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "mytarget", name: "myTarget", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
    ],
  },
  max: {
    id: "max",
    name: "AppLovin MAX",
    logo: "/logos/applovin.svg",
    description: "Industry-leading mediation with real-time bidding and 25+ networks.",
    subtitle: "Real-time bidding mediation with 26 networks",
    status: "coming-soon",
    adSources: [
      { id: "admob", name: "Google AdMob", logo: "/logos/admob.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "meta", name: "Meta Audience Network", logo: "/logos/meta.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "unity", name: "Unity Ads", logoLight: "/logos/unity.svg", logoDark: "/logos/unity-light.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "pangle", name: "Pangle", logo: "/logos/pangle.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "mintegral", name: "Mintegral", logo: "/logos/mintegral.png", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "inmobi", name: "InMobi", logo: "/logos/inmobi.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "liftoff", name: "Liftoff", logoLight: "/logos/liftoff.svg", logoDark: "/logos/liftoff-light.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "chartboost", name: "Chartboost", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "vungle", name: "Vungle", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "dtexchange", name: "DT Exchange", logo: "/logos/dtexchange.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "ironsource", name: "ironSource", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "amazon", name: "Amazon", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "yahoo", name: "Yahoo", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "snap", name: "Snap", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "tencent", name: "Tencent", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "verve", name: "Verve", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "smaato", name: "Smaato", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "gam", name: "Google Ad Manager", logo: "/logos/google-ad-manager.svg", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "bidmachine", name: "BidMachine", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "hyprmx", name: "HyprMX", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "maio", name: "Maio", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "line", name: "LINE", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "yandex", name: "Yandex", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "mytarget", name: "myTarget", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "nend", name: "Nend", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
      { id: "fyber", name: "Fyber", supportsBidding: true, supportsWaterfall: true, status: "coming-soon" },
    ],
  },
}

// List-style card for detail page - same as main page
function NetworkCard({ source }: { source: AdSource }) {
  const hasThemeLogo = source.logoLight && source.logoDark
  const isComingSoon = source.status === "coming-soon"

  return (
    <div className={`group relative flex items-start gap-4 p-5 rounded-xl bg-[#18191b] border border-transparent hover:border-[#2a2b2e] transition-all duration-150 ${isComingSoon ? 'opacity-60' : ''}`}>
      {/* Logo - no background for SVGs */}
      <div className="h-11 w-11 flex items-center justify-center flex-shrink-0">
        {hasThemeLogo ? (
          <ThemeAwareLogo logoLight={source.logoLight!} logoDark={source.logoDark!} alt={source.name} size={44} />
        ) : source.logo ? (
          <Image src={source.logo} alt={source.name} width={44} height={44} className="object-contain" />
        ) : (
          <div className="h-11 w-11 rounded-xl bg-[#232428] flex items-center justify-center">
            <span className="text-[17px] font-semibold text-[#6b6f76]">{source.name.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* Name and badges */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h4 className="text-[15px] font-medium text-[#f7f8f8] mb-1">{source.name}</h4>
        <div className="flex items-center gap-1.5 text-[13px] text-[#6b6f76]">
          {source.supportsBidding && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-[#5e6ad2]" />
              Bidding
            </span>
          )}
          {source.supportsBidding && source.supportsWaterfall && (
            <span className="text-[#3a3d42]">·</span>
          )}
          {source.supportsWaterfall && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-[#3b9a6d]" />
              Waterfall
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      {isComingSoon && (
        <div className="absolute top-4 right-4">
          <span className="text-[11px] font-medium text-[#6b6f76] bg-[#232428] px-2 py-0.5 rounded">Soon</span>
        </div>
      )}
    </div>
  )
}

export default function PlatformDetailPage() {
  const params = useParams()
  const platformId = params.platform as string
  const platform = platformsData[platformId]

  if (!platform) {
    return (
      <div className="min-h-screen bg-[#08090a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[24px] font-semibold text-[#f7f8f8] mb-2">Platform not found</h1>
          <Link href="/platforms" className="text-[#5e6ad2] hover:text-[#7c85e0]">
            Back to Platforms
          </Link>
        </div>
      </div>
    )
  }

  const hasThemeLogo = platform.logoLight && platform.logoDark
  const availableSources = platform.adSources.filter(s => s.status === "available")
  const comingSoonSources = platform.adSources.filter(s => s.status === "coming-soon")

  return (
    <div className="min-h-screen bg-[#08090a]">
      {/* Header with breadcrumb and hero */}
      <div className="pt-10 pb-12">
        <div className="mx-auto max-w-[1024px] px-6">
          {/* Breadcrumb - centered */}
          <nav className="flex items-center justify-center gap-2 text-[14px] mb-6">
            <Link href="/platforms" className="text-[#6b6f76] hover:text-[#f7f8f8] transition-colors">
              Platforms
            </Link>
            <span className="text-[#3a3d42]">/</span>
            <span className="text-[#8a8f98]">{platform.name}</span>
          </nav>

          {/* Hero - Linear style centered */}
          <div className="text-center max-w-[600px] mx-auto">
            <h1 className="text-[40px] font-semibold tracking-tight text-[#f7f8f8] mb-3">
              {platform.subtitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Networks grid */}
      <div className="pb-20">
        <div className="mx-auto max-w-[1024px] px-6">
          {/* Available networks */}
          {availableSources.length > 0 && (
            <div className="mb-10">
              <h2 className="text-[13px] font-medium text-[#6b6f76] uppercase tracking-wider mb-4">
                Available ({availableSources.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSources.map((source) => (
                  <NetworkCard key={source.id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Coming soon networks */}
          {comingSoonSources.length > 0 && (
            <div>
              <h2 className="text-[13px] font-medium text-[#6b6f76] uppercase tracking-wider mb-4">
                Coming Soon ({comingSoonSources.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comingSoonSources.map((source) => (
                  <NetworkCard key={source.id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-14 pt-6 border-t border-[#1f2023]">
            <Link
              href="/platforms"
              className="inline-flex items-center gap-2 text-[14px] text-[#6b6f76] hover:text-[#f7f8f8] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all platforms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
