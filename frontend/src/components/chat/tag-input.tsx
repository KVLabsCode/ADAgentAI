"use client"

import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Compact chip-based input for array values.
 * Keyboard-friendly: Enter to add, Backspace to remove last.
 */
export function TagInput({
  value = [],
  onChange,
  placeholder = "Add item...",
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()])
      }
      setInputValue("")
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()])
      setInputValue("")
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 min-h-[28px] px-1.5 py-0.5",
        "bg-zinc-900/80 border border-zinc-700/50 rounded-md",
        "focus-within:ring-[3px] focus-within:ring-amber-500/30 focus-within:border-amber-500/50",
        "overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Existing tags */}
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded",
            "bg-zinc-700/80 text-zinc-200 text-[10px] font-medium",
            "shrink-0 select-none"
          )}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(index)
            }}
            className="ml-0.5 hover:text-red-400 transition-colors"
            disabled={disabled}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {/* Input for new tags */}
      <div className="flex items-center gap-1 min-w-[60px] flex-1">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className={cn(
            "h-5 px-1 py-0 text-[10px] bg-transparent border-0 shadow-none",
            "focus-visible:ring-0 focus-visible:border-0",
            "placeholder:text-zinc-600 min-w-[40px]"
          )}
        />
        {inputValue.trim() && (
          <button
            type="button"
            onClick={addTag}
            className="p-0.5 text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
