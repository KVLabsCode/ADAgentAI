import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Linear input styling via design tokens
        "h-[var(--input-height)] w-full min-w-0 rounded-[var(--input-radius)] border-[length:var(--input-border-width)]",
        "px-[var(--input-padding-x)] py-[var(--input-padding-y)] text-[length:var(--input-font-size)] font-normal",
        "bg-transparent dark:bg-[var(--card-bg)] border-[color:var(--card-border)]",
        "placeholder:text-muted-foreground text-foreground caret-foreground",
        "transition-[color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "selection:bg-primary selection:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
