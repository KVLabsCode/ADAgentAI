"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const loaderVariants = cva("relative flex items-center justify-center", {
  variants: {
    size: {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

const circularLoaderVariants = cva("relative inline-flex items-center justify-center", {
  variants: {
    size: {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

const barVariants = cva("absolute rounded-full bg-current", {
  variants: {
    size: {
      sm: "w-0.5 h-1.5",
      md: "w-0.5 h-2",
      lg: "w-1 h-2.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export interface LoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loaderVariants> {}

/**
 * Classic rotating bars loader without flashing ping animation.
 * Uses 8 bars with staggered fade animation for smooth loading indication.
 */
const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size, ...props }, ref) => {
    // 8 bars positioned around the center
    const bars = Array.from({ length: 8 }, (_, i) => {
      const rotation = i * 45 // 360 / 8 = 45 degrees apart
      const delay = i * 0.125 // Stagger: 1s / 8 = 0.125s apart

      // Calculate bar position - bars are positioned at the edge pointing inward
      const barOffset = size === "sm" ? 5 : size === "lg" ? 10 : 7.5

      return (
        <span
          key={i}
          className={cn(barVariants({ size }), "animate-spinner-fade")}
          style={{
            transform: `rotate(${rotation}deg) translateY(-${barOffset}px)`,
            transformOrigin: "center center",
            animationDelay: `${delay}s`,
          }}
        />
      )
    })

    return (
      <div
        ref={ref}
        className={cn(loaderVariants({ size }), className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        {bars}
        <span className="sr-only">Loading...</span>
      </div>
    )
  }
)
Loader.displayName = "Loader"

export interface CircularLoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof circularLoaderVariants> {
  children?: React.ReactNode
}

/**
 * Circular pulse loader with optional icon in center.
 * Shows pulsing concentric circles that scale big and small.
 */
const CircularLoader = React.forwardRef<HTMLDivElement, CircularLoaderProps>(
  ({ className, size, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(circularLoaderVariants({ size }), className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        {/* Outer pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-[circular-pulse_1.5s_ease-in-out_infinite]" />
        {/* Inner pulsing ring - offset timing */}
        <span className="absolute inset-[2px] rounded-full bg-current opacity-10 animate-[circular-pulse_1.5s_ease-in-out_infinite_0.2s]" />
        {/* Icon in center */}
        {children && (
          <span className="relative z-10">{children}</span>
        )}
        <span className="sr-only">Loading...</span>
      </div>
    )
  }
)
CircularLoader.displayName = "CircularLoader"

/**
 * Spinning circle loader (classic circular spinner)
 */
export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof circularLoaderVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, ...props }, ref) => {
    const sizeClasses = {
      sm: "size-4 border-2",
      md: "size-5 border-2",
      lg: "size-6 border-[2.5px]",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-current border-t-transparent",
          sizeClasses[size || "md"],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    )
  }
)
Spinner.displayName = "Spinner"

export { Loader, loaderVariants, CircularLoader, circularLoaderVariants, Spinner }
