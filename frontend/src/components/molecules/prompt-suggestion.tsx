"use client"

import { Button, buttonVariants } from "@/atoms/button"
import { cn } from "@/lib/utils"
import { VariantProps } from "class-variance-authority"

export type PromptSuggestionProps = {
  children: React.ReactNode
  variant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
  className?: string
  highlight?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

function PromptSuggestion({
  children,
  variant,
  size,
  className,
  highlight,
  ...props
}: PromptSuggestionProps) {
  const isHighlightMode = highlight !== undefined && highlight.trim() !== ""
  const content = typeof children === "string" ? children : ""

  if (!isHighlightMode) {
    return (
      <Button
        variant={variant || "outline"}
        size={size || "lg"}
        className={cn("rounded-full", className)}
        {...props}
      >
        {children}
      </Button>
    )
  }

  if (!content) {
    return (
      <Button
        variant={variant || "ghost"}
        size={size || "sm"}
        className={cn(
          "w-full cursor-pointer justify-start rounded-xl py-2 hover:bg-accent",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    )
  }

  const trimmedHighlight = highlight.trim()
  const contentLower = content.toLowerCase()
  const highlightLower = trimmedHighlight.toLowerCase()
  const shouldHighlight = contentLower.includes(highlightLower)

  return (
    <Button
      variant={variant || "ghost"}
      size={size || "sm"}
      className={cn(
        "w-full cursor-pointer justify-start gap-0 rounded-xl py-2 hover:bg-accent",
        className
      )}
      {...props}
    >
      <span className="text-muted-foreground">
        {shouldHighlight ? (() => {
          const index = contentLower.indexOf(highlightLower)
          if (index === -1) return content

          const actualText = content.substring(index, index + highlightLower.length)
          const before = content.substring(0, index)
          const after = content.substring(index + actualText.length)

          return (
            <>
              {before}
              <span className="text-primary font-medium">{actualText}</span>
              {after}
            </>
          )
        })() : content}
      </span>
    </Button>
  )
}

export { PromptSuggestion }
