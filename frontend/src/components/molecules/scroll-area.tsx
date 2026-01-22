"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  style,
  viewportClassName,
  type = "hover",
  scrollHideDelay = 400,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  style?: React.CSSProperties
  viewportClassName?: string
}) {
  // Extract maxHeight to apply to viewport for proper scroll behavior
  const { maxHeight, ...restStyle } = style || {}

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      style={restStyle}
      type={type}
      scrollHideDelay={scrollHideDelay}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn("!block w-full h-full rounded-[inherit]", viewportClassName)}
        style={maxHeight ? { maxHeight, overflowY: 'scroll' } : { overflowY: 'scroll' }}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors duration-150",
        orientation === "vertical" &&
          "h-full w-3 py-2 pr-1.5",
        orientation === "horizontal" &&
          "w-full h-3 px-2 pb-1.5 flex-col",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-lg bg-zinc-500 hover:bg-zinc-400 transition-colors duration-150"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
