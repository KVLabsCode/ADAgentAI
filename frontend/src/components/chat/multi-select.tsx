"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

/**
 * Compact multi-select dropdown with checkboxes.
 * Selected items shown as badges, removable individually.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  disabled = false,
  isLoading = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label || v)
    .slice(0, 2) // Show max 2 badges

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "h-auto min-h-7 w-full justify-between px-2 py-1",
            "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800/80",
            "focus:ring-amber-500/30 focus:border-amber-500/50",
            "text-[11px] font-normal",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center min-w-0">
            {value.length === 0 ? (
              <span className="text-zinc-500">{isLoading ? "Loading..." : placeholder}</span>
            ) : (
              <>
                {selectedLabels.map((label, i) => (
                  <Badge
                    key={value[i]}
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] bg-zinc-700/50 text-zinc-200 hover:bg-zinc-600/50 shrink-0"
                  >
                    <span className="truncate max-w-[80px]">{label}</span>
                    <X
                      className="ml-1 h-2.5 w-2.5 cursor-pointer hover:text-red-400"
                      onClick={(e) => handleRemove(value[i], e)}
                    />
                  </Badge>
                ))}
                {value.length > 2 && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] bg-zinc-700/50 text-zinc-400 shrink-0"
                  >
                    +{value.length - 2}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-zinc-900 border-zinc-700" align="start">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search..."
            className="h-8 text-[11px] border-none focus:ring-0"
          />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-[11px] text-zinc-500">
              No items found.
            </CommandEmpty>
            <CommandGroup className="max-h-[180px] overflow-auto">
              {options.map((option) => {
                const isSelected = value.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className="text-[11px] text-zinc-200 cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border",
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-zinc-900"
                          : "border-zinc-600 bg-transparent"
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
