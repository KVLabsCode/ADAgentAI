"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/atoms/avatar"
import { Markdown } from "@/atoms/markdown"

// =============================================================================
// Message Container
// =============================================================================

const messageVariants = cva("flex gap-3 w-full", {
  variants: {
    variant: {
      user: "justify-end",
      assistant: "justify-start",
    },
  },
  defaultVariants: {
    variant: "assistant",
  },
})

interface MessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof messageVariants> {}

/**
 * Message container - flex wrapper that positions content based on role.
 * Use variant="user" for right-aligned user messages.
 * Use variant="assistant" (default) for left-aligned assistant messages.
 */
const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(messageVariants({ variant }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Message.displayName = "Message"

// =============================================================================
// Message Avatar
// =============================================================================

interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  fallback?: string
  alt?: string
}

/**
 * Message avatar - displays user or assistant avatar.
 * Uses gradient fallback when no image is provided.
 */
const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ className, src, fallback = "U", alt = "Avatar", ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex-shrink-0", className)} {...props}>
        <Avatar className="w-7 h-7">
          {src ? (
            <AvatarImage src={src} alt={alt} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white text-xs font-semibold">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }
)
MessageAvatar.displayName = "MessageAvatar"

// =============================================================================
// Message Content
// =============================================================================

const contentVariants = cva(
  "relative max-w-[85%] rounded-2xl px-4 py-2.5",
  {
    variants: {
      variant: {
        user: "bg-secondary text-secondary-foreground",
        assistant: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "assistant",
    },
  }
)

interface MessageContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof contentVariants> {
  markdown?: boolean
  messageId?: string
}

/**
 * Message content bubble - contains the message text.
 * Use variant="user" for styled bubble with background.
 * Use variant="assistant" for plain content (assistant uses more complex layouts).
 * Enable markdown=true to render content as markdown.
 */
const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ className, variant, markdown = false, messageId, children, ...props }, ref) => {
    // If markdown is enabled and children is a string, render with Markdown component
    const content =
      markdown && typeof children === "string" ? (
        <Markdown content={children} id={messageId} />
      ) : (
        children
      )

    return (
      <div
        ref={ref}
        className={cn(contentVariants({ variant }), className)}
        {...props}
      >
        {content}
      </div>
    )
  }
)
MessageContent.displayName = "MessageContent"

// =============================================================================
// Message Actions
// =============================================================================

type MessageActionsProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Message actions container - wraps action buttons (copy, like, etc.)
 * Typically shown on hover for assistant messages.
 */
const MessageActions = React.forwardRef<HTMLDivElement, MessageActionsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
MessageActions.displayName = "MessageActions"

// =============================================================================
// Exports
// =============================================================================

export { Message, MessageAvatar, MessageContent, MessageActions, messageVariants, contentVariants }
