import * as React from "react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/atoms/button"
import { Switch } from "@/atoms/switch"
import { Label } from "@/atoms/label"
import { cn } from "@/lib/utils"
import type { FooterControlsProps } from "./types"

interface ToggleButtonGroupProps {
  label: string
  value: string
  options: Array<{
    value: string
    label: string
    title?: string
  }>
  onChange: (value: string) => void
}

/**
 * Toggle button group for settings like Response Style, Display Mode, etc.
 * Memoized to prevent re-renders when other settings change.
 */
const ToggleButtonGroup = React.memo(function ToggleButtonGroup({
  label,
  value,
  options,
  onChange,
}: ToggleButtonGroupProps) {
  return (
    <div className="flex items-center gap-1.5 lg:gap-2">
      <span className="text-[9px] lg:text-[10px] text-muted-foreground shrink-0">
        {label}:
      </span>
      <div className="flex gap-0.5 p-0.5 rounded border border-border/50 bg-muted">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.title}
            className={cn(
              "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-[background-color,color,box-shadow]",
              value === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
})

/**
 * Footer controls component with settings toggles and summary.
 * Memoized to prevent re-renders when provider list changes.
 */
export const FooterControls = React.memo(function FooterControls({
  responseStyle,
  displayMode,
  contextMode,
  safeMode,
  autoIncludeContext,
  enabledProviderCount,
  totalProviderCount,
  onResponseStyleChange,
  onDisplayModeChange,
  onContextModeChange,
  onSafeModeChange,
  onAutoIncludeContextChange,
  onClose,
}: FooterControlsProps) {
  return (
    <div className="border-t border-border/30 px-3 lg:px-4 py-2 lg:py-3 shrink-0 relative z-10 bg-card">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 lg:gap-3">
        {/* Response Style */}
        <ToggleButtonGroup
          label="Response"
          value={responseStyle}
          options={[
            { value: "concise", label: "Concise" },
            { value: "detailed", label: "Detailed" },
          ]}
          onChange={(v) => onResponseStyleChange(v as "concise" | "detailed")}
        />

        {/* Display Mode */}
        <ToggleButtonGroup
          label="Display"
          value={displayMode}
          options={[
            {
              value: "detailed",
              label: "Full",
              title: "Show all agent reasoning and tool details",
            },
            {
              value: "compact",
              label: "Compact",
              title: "Hide reasoning, collapse tool calls",
            },
          ]}
          onChange={(v) => onDisplayModeChange(v as "detailed" | "compact")}
        />

        {/* Context Mode */}
        <ToggleButtonGroup
          label="Context"
          value={contextMode}
          options={[
            {
              value: "soft",
              label: "Soft",
              title: "Warns about disabled entities but allows operations",
            },
            {
              value: "strict",
              label: "Strict",
              title: "Blocks operations on disabled entities",
            },
          ]}
          onChange={(v) => onContextModeChange(v as "soft" | "strict")}
        />
      </div>

      {/* Safe Mode and Auto-context row */}
      <div className="flex items-center gap-3 lg:gap-4 mt-2 pt-2 border-t border-border/20">
        {/* Safe Mode */}
        <div className="flex items-center gap-1">
          <ShieldCheck
            className={cn(
              "h-3 w-3 shrink-0 transition-colors",
              safeMode ? "text-emerald-500" : "text-muted-foreground/50"
            )}
          />
          <Label
            className="text-[9px] lg:text-[10px] text-muted-foreground cursor-pointer"
            htmlFor="safe-mode"
          >
            Safe
          </Label>
          <Switch
            id="safe-mode"
            checked={safeMode}
            onCheckedChange={onSafeModeChange}
            className="scale-[0.65] lg:scale-75 shrink-0"
          />
        </div>

        {/* Auto-context */}
        <div className="flex items-center gap-1">
          <Label
            className="text-[9px] lg:text-[10px] text-muted-foreground cursor-pointer"
            htmlFor="auto-context"
          >
            Auto-include
          </Label>
          <Switch
            id="auto-context"
            checked={autoIncludeContext}
            onCheckedChange={onAutoIncludeContextChange}
            className="scale-[0.65] lg:scale-75 shrink-0"
          />
        </div>

        {/* Summary and Done button inline */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-[9px] lg:text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">{enabledProviderCount}</span>/
            {totalProviderCount}
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="h-6 lg:h-7 px-2 lg:px-3 text-[10px] lg:text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
})
