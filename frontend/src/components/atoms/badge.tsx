import * as React from "react"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "rounded-full border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "rounded-full border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "rounded-full border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "rounded-full text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // New context badge variants - rectangular style like v0
        context:
          "rounded-md bg-muted/60 text-foreground border-border/40 hover:bg-muted hover:border-border/60 cursor-pointer",
        "context-provider":
          "rounded-md bg-badge-provider/15 text-badge-provider border-badge-provider/30 hover:bg-badge-provider/25 cursor-pointer",
        "context-app":
          "rounded-md bg-badge-app/15 text-badge-app border-badge-app/30 hover:bg-badge-app/25 cursor-pointer",
        "context-entity":
          "rounded-md bg-badge-entity/15 text-badge-entity border-badge-entity/30 hover:bg-badge-entity/25 cursor-pointer",
        // Status badge - subtle indicator
        status:
          "rounded-md bg-muted/40 text-muted-foreground border-transparent text-[10px]",
        // Action badge - clickable pill like v0
        action:
          "rounded-md bg-card border-border/50 text-foreground hover:bg-accent hover:border-border cursor-pointer shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, render, ...props }: BadgeProps) {
  return useRender({
    render,
    props: {
      ...props,
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
    },
    defaultTagName: "span",
  })
}

// Removable badge for context selection - shows X button on hover
interface RemovableBadgeProps extends React.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"]
  onRemove?: () => void
  icon?: React.ReactNode
}

function RemovableBadge({
  className,
  variant = "context",
  onRemove,
  icon,
  children,
  ...props
}: RemovableBadgeProps) {
  return (
    <span
      data-slot="removable-badge"
      className={cn(
        badgeVariants({ variant }),
        "group pr-1 gap-1.5 animate-badge-in",
        className
      )}
      {...props}
    >
      {icon && <span className="[&>svg]:size-3">{icon}</span>}
      <span className="truncate max-w-[120px]">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 hover:bg-foreground/10 p-0.5 transition-opacity"
        >
          <X className="size-2.5" />
          <span className="sr-only">Remove</span>
        </button>
      )}
    </span>
  )
}

export { Badge, RemovableBadge, badgeVariants }
