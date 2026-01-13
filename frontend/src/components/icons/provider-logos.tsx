import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const SIZE_PX = {
  sm: 20,
  md: 32,
  lg: 40,
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
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
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
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
        className="object-contain"
      />
    </div>
  )
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
