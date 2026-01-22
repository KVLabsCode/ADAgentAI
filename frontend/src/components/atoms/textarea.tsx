import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Linear textarea styling via design tokens (same as input, just taller)
        "flex field-sizing-content min-h-16 w-full rounded-[var(--input-radius)] border-[length:var(--input-border-width)]",
        "px-[var(--input-padding-x)] py-[var(--input-padding-y)] text-[length:var(--input-font-size)] font-normal",
        "bg-transparent dark:bg-[var(--card-bg)] border-[color:var(--card-border)]",
        "placeholder:text-muted-foreground text-foreground caret-foreground",
        "transition-[color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
