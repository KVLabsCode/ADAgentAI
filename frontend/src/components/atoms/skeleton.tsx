import { cn } from "@/lib/utils"

interface SkeletonProps extends React.ComponentProps<"div"> {
  shimmer?: boolean
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md",
        shimmer
          ? "bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 bg-[length:200%_100%] animate-shimmer"
          : "bg-accent animate-pulse",
        className
      )}
      {...props}
    />
  )
}

/**
 * Loading skeleton for chat responses - Perplexity style
 */
function ResponseSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {/* First line - longer */}
      <Skeleton shimmer className="h-4 w-[85%]" />
      {/* Second line - medium */}
      <Skeleton shimmer className="h-4 w-[70%]" />
      {/* Third line - shorter */}
      <Skeleton shimmer className="h-4 w-[45%]" />
    </div>
  )
}

/**
 * Compact skeleton for inline loading
 */
function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Skeleton shimmer className="h-3 w-3 rounded-full" />
      <Skeleton shimmer className="h-3 w-24" />
    </div>
  )
}

export { Skeleton, ResponseSkeleton, InlineSkeleton }
