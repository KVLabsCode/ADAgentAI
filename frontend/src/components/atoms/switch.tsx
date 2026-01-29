"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    // Linear toggle style: 30x20px track, 14x14px thumb, 3px padding
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Green when checked, muted when unchecked
        "peer data-[checked]:bg-success data-[unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[unchecked]:bg-input/80",
        // Dimensions: 30x20px, fully rounded
        "inline-flex h-5 w-[30px] shrink-0 items-center rounded-full",
        "border border-transparent shadow-xs transition-colors outline-none focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* Thumb: 14x14px circle with 3px padding from edges */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // White thumb
          "bg-white pointer-events-none block rounded-full ring-0 transition-transform",
          // Size: 14x14px
          "size-3.5",
          // Position: 3px padding from edges
          // Unchecked: 3px from left
          // Checked: 30px - 14px - 3px = 13px from left
          "data-[unchecked]:translate-x-[3px] data-[checked]:translate-x-[13px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
