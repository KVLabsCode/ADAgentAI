"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
}

/**
 * AdMob Logo - Official Google AdMob logo
 * Source: worldvectorlogo.com
 */
export function AdMobLogo({ className, size = "md" }: LogoProps) {
  return (
    <div className={cn(SIZE_CLASSES[size], "relative flex-shrink-0", className)}>
      <Image
        src="/logos/admob.svg"
        alt="AdMob"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * Google Ad Manager Logo - Official Google Ad Manager logo
 * Source: worldvectorlogo.com
 */
export function GoogleAdManagerLogo({ className, size = "md" }: LogoProps) {
  return (
    <div className={cn(SIZE_CLASSES[size], "relative flex-shrink-0", className)}>
      <Image
        src="/logos/google-ad-manager.svg"
        alt="Google Ad Manager"
        fill
        className="object-contain"
      />
    </div>
  )
}

interface NetworkLogoProps extends LogoProps {
  disabled?: boolean
}

/**
 * AppLovin MAX Logo
 */
export function AppLovinLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src="/logos/applovin.svg"
        alt="AppLovin MAX"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * Unity LevelPlay Logo - Official Unity logo
 * Uses light version (white) for dark theme, dark version for light theme
 */
export function UnityLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === "dark" ? "/logos/unity-light.svg" : "/logos/unity.svg"

  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src={logoSrc}
        alt="Unity"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * Liftoff (Vungle) Logo - Official Liftoff logo
 * Uses light version (white) for dark theme, dark version for light theme
 */
export function LiftoffLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === "dark" ? "/logos/liftoff-light.svg" : "/logos/liftoff.svg"

  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src={logoSrc}
        alt="Liftoff"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * InMobi Logo - Official InMobi logo
 */
export function InMobiLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src="/logos/inmobi.svg"
        alt="InMobi"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * Mintegral Logo - Official Mintegral logo
 */
export function MintegralLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src="/logos/mintegral.png"
        alt="Mintegral"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * Pangle Logo - Official Pangle logo
 * Source: Pangle brand assets
 */
export function PangleLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src="/logos/pangle.svg"
        alt="Pangle"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * DT Exchange Logo - Official Digital Turbine logo
 */
export function DTExchangeLogo({ className, size = "md", disabled = false }: NetworkLogoProps) {
  return (
    <div className={cn(
      SIZE_CLASSES[size],
      "relative flex-shrink-0",
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Image
        src="/logos/dtexchange.svg"
        alt="DT Exchange"
        fill
        className="object-contain"
      />
    </div>
  )
}

/**
 * Generic network logo component that handles all networks
 */
export function NetworkLogo({
  network,
  size = "md",
  disabled = false,
  className
}: {
  network: string
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  className?: string
}) {
  switch (network) {
    case "admob":
      return <AdMobLogo size={size} className={cn(disabled && "grayscale brightness-75 opacity-70", className)} />
    case "gam":
      return <GoogleAdManagerLogo size={size} className={cn(disabled && "grayscale brightness-75 opacity-70", className)} />
    case "applovin":
      return <AppLovinLogo size={size} disabled={disabled} className={className} />
    case "unity":
      return <UnityLogo size={size} disabled={disabled} className={className} />
    case "liftoff":
      return <LiftoffLogo size={size} disabled={disabled} className={className} />
    case "inmobi":
      return <InMobiLogo size={size} disabled={disabled} className={className} />
    case "mintegral":
      return <MintegralLogo size={size} disabled={disabled} className={className} />
    case "pangle":
      return <PangleLogo size={size} disabled={disabled} className={className} />
    case "dtexchange":
      return <DTExchangeLogo size={size} disabled={disabled} className={className} />
    default:
      // Fallback to first letter
      return (
        <div className={cn(
          SIZE_CLASSES[size],
          "relative flex-shrink-0 rounded bg-gray-500 flex items-center justify-center",
          disabled && "grayscale brightness-75 opacity-70",
          className
        )}>
          <span className="text-white font-bold text-[10px]">{network.charAt(0).toUpperCase()}</span>
        </div>
      )
  }
}

/**
 * Combined logo badge component for consistent display
 * Handles both connected (active) and coming soon (disabled) states
 */
interface ProviderLogoBadgeProps {
  type: "admob" | "gam"
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProviderLogoBadge({
  type,
  disabled = false,
  size = "md",
  className
}: ProviderLogoBadgeProps) {
  const Logo = type === "admob" ? AdMobLogo : GoogleAdManagerLogo

  return (
    <div className={cn(
      disabled && "grayscale brightness-75 opacity-70",
      className
    )}>
      <Logo size={size} />
    </div>
  )
}
