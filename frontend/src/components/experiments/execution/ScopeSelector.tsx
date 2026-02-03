"use client"

import { Label } from "@/atoms/label"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import { AD_FORMATS, type AdFormat, type ExecutionScope } from "@/lib/experiments"

interface ScopeSelectorProps {
  scope: ExecutionScope
  onChange: (scope: ExecutionScope) => void
}

const APP_OPTIONS = [
  { value: "all", label: "All Apps" },
  { value: "selected", label: "Selected Apps" },
]

export function ScopeSelector({ scope, onChange }: ScopeSelectorProps) {
  const toggleFormat = (format: AdFormat) => {
    const current = scope.formats
    const newFormats = current.includes(format)
      ? current.filter((f) => f !== format)
      : [...current, format]
    onChange({ ...scope, formats: newFormats })
  }

  const toggleCountry = (country: string) => {
    const current = scope.countries
    const newCountries = current.includes(country)
      ? current.filter((c) => c !== country)
      : [...current, country]
    onChange({ ...scope, countries: newCountries })
  }

  return (
    <div className="space-y-5">
      {/* Apps */}
      <div className="space-y-2">
        <Label>Apps</Label>
        <Select
          value={scope.apps === "all" ? "all" : "selected"}
          onValueChange={(v) =>
            onChange({ ...scope, apps: v === "all" ? "all" : [] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ad Formats */}
      <div className="space-y-2">
        <Label>Ad Formats</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AD_FORMATS).map(([key, config]) => {
            const isSelected = scope.formats.includes(key as AdFormat)
            return (
              <button
                key={key}
                onClick={() => toggleFormat(key as AdFormat)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors border",
                  isSelected
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                {config.displayName}
              </button>
            )
          })}
        </div>
      </div>

      {/* Countries */}
      <div className="space-y-2">
        <Label>Countries</Label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-md bg-muted/20 border border-border/50">
          {scope.countries.length === 0 ? (
            <p className="text-[length:var(--text-description)] text-muted-foreground p-2">
              Click to add countries
            </p>
          ) : (
            scope.countries.map((code) => (
              <Badge
                key={code}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => toggleCountry(code)}
              >
                {code}
                <span className="ml-1">&times;</span>
              </Badge>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {["US", "CA", "GB", "AU", "DE", "FR", "JP"].map((code) => {
            const isSelected = scope.countries.includes(code)
            if (isSelected) return null
            return (
              <button
                key={code}
                onClick={() => toggleCountry(code)}
                className="px-2 py-0.5 rounded text-xs bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
              >
                + {code}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
