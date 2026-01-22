"use client"

import { cn } from "@/lib/utils"
import React, { createContext, useContext, useRef } from "react"

type PromptInputContextType = {
  disabled?: boolean
}

const PromptInputContext = createContext<PromptInputContextType>({
  disabled: false,
})

export function usePromptInput() {
  return useContext(PromptInputContext)
}

export type PromptInputProps = {
  children: React.ReactNode
  className?: string
  disabled?: boolean
} & React.ComponentProps<"div">

function PromptInput({
  className,
  children,
  disabled = false,
  onClick,
  ...props
}: PromptInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!disabled) {
      // Focus the textarea inside if clicked on the container
      const textarea = containerRef.current?.querySelector("textarea")
      textarea?.focus()
    }
    onClick?.(e)
  }

  return (
    <PromptInputContext.Provider value={{ disabled }}>
      <div
        ref={containerRef}
        onClick={handleClick}
        className={cn(
          "cursor-text rounded-3xl border border-input bg-background p-2 shadow-xs",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

export type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  )
}

export { PromptInput, PromptInputActions }
