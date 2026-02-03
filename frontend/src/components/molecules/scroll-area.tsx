"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"
import { ScrollArea as BaseScrollArea } from "@base-ui-components/react/scroll-area"

import { cn } from "@/lib/utils"
import { useTouchPrimary } from "@/hooks/use-touch-primary"

interface ScrollAreaProps {
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
  viewportClassName?: string
  maxHeight?: string | number
  /** Height of fade masks in pixels. Set to 0 to disable. Default: 30 */
  maskHeight?: number
  maskClassName?: string
}

/**
 * Adaptive ScrollArea - Lina pattern with Base UI
 * Touch devices: native scrolling + masks (better UX, momentum, rubber-banding)
 * Desktop: custom Base UI scrollbar + masks (refined styling)
 * @see https://lina.sameer.sh/
 */
function ScrollArea({
  className,
  children,
  style,
  viewportClassName,
  maxHeight: maxHeightProp,
  maskHeight = 0,
  maskClassName,
}: ScrollAreaProps) {
  const isTouchPrimary = useTouchPrimary()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  // Extract maxHeight to apply to viewport for proper scroll behavior
  const { maxHeight: styleMaxHeight, ...restStyle } = style || {}
  const maxHeight = maxHeightProp || styleMaxHeight

  const handleScroll = useCallback(() => {
    const el = viewportRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    setCanScrollUp(scrollTop > 1)
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1)
  }, [])

  // Check scroll state on mount and content changes
  const setViewportRef = useCallback((el: HTMLDivElement | null) => {
    (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (el) {
      handleScroll()
      // Re-check when content might have changed
      const observer = new ResizeObserver(handleScroll)
      observer.observe(el)
      return () => observer.disconnect()
    }
  }, [handleScroll])

  const maskStyles = maskHeight > 0 ? {
    top: {
      height: maskHeight,
      background: "linear-gradient(to bottom, var(--scroll-area-mask-color, var(--background)), transparent)",
    },
    bottom: {
      height: maskHeight,
      background: "linear-gradient(to top, var(--scroll-area-mask-color, var(--background)), transparent)",
    },
  } : null

  // Touch devices: native scrolling + masks
  if (isTouchPrimary) {
    return (
      <div
        data-slot="scroll-area"
        data-touch="true"
        className={cn("relative", className)}
        style={restStyle}
      >
        <div
          ref={setViewportRef}
          onScroll={handleScroll}
          className={cn("w-full h-full overflow-auto overscroll-contain", viewportClassName)}
          style={{ maxHeight, WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
        {maskStyles && (
          <>
            <div
              data-slot="scroll-mask-top"
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-150",
                canScrollUp ? "opacity-100" : "opacity-0",
                maskClassName
              )}
              style={maskStyles.top}
            />
            <div
              data-slot="scroll-mask-bottom"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-150",
                canScrollDown ? "opacity-100" : "opacity-0",
                maskClassName
              )}
              style={maskStyles.bottom}
            />
          </>
        )}
      </div>
    )
  }

  // Desktop: custom Base UI scrollbar + masks
  return (
    <BaseScrollArea.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      style={restStyle}
    >
      <BaseScrollArea.Viewport
        ref={setViewportRef}
        onScroll={handleScroll}
        data-slot="scroll-area-viewport"
        className={cn("w-full h-full rounded-[inherit] pr-3 overscroll-contain", viewportClassName)}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </BaseScrollArea.Viewport>
      <ScrollBar orientation="vertical" />
      <BaseScrollArea.Corner />
      {maskStyles && (
        <>
          <div
            data-slot="scroll-mask-top"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-150",
              canScrollUp ? "opacity-100" : "opacity-0",
              maskClassName
            )}
            style={maskStyles.top}
          />
          <div
            data-slot="scroll-mask-bottom"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-150",
              canScrollDown ? "opacity-100" : "opacity-0",
              maskClassName
            )}
            style={maskStyles.bottom}
          />
        </>
      )}
    </BaseScrollArea.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
}: {
  className?: string
  orientation?: "vertical" | "horizontal"
}) {
  return (
    <BaseScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors duration-150",
        orientation === "vertical" && "h-full w-2.5 py-1 pr-1",
        orientation === "horizontal" && "w-full h-2.5 px-1 pb-1 flex-col",
        className
      )}
    >
      <BaseScrollArea.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-zinc-400/60 hover:bg-zinc-400 transition-colors duration-150"
      />
    </BaseScrollArea.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
