"use client"

import * as React from "react"

/**
 * Visually hide content while keeping it accessible to screen readers.
 * Uses standard sr-only CSS pattern.
 */
function VisuallyHidden({ children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      {...props}
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
        ...props.style,
      }}
    >
      {children}
    </span>
  )
}

// Also export as Root for Radix-style usage compatibility
const Root = VisuallyHidden

export { VisuallyHidden, Root }
export default VisuallyHidden
