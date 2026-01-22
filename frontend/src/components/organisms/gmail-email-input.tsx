"use client"

import * as React from "react"
import { Input } from "@/atoms/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import { cn } from "@/lib/utils"

// Monochrome Google "G" logo - uses currentColor for theme compatibility
function GoogleIconMono({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// Supported email domains
export interface EmailDomain {
  id: string
  label: string
}

export const GMAIL_DOMAINS: EmailDomain[] = [
  { id: "gmail.com", label: "gmail.com" },
]

// Future domains can be added:
// { id: "outlook.com", label: "outlook.com" },
// { id: "custom", label: "Custom" },

export interface GmailEmailInputProps {
  value: string
  onChange: (value: string) => void
  domain: string
  onDomainChange: (domain: string) => void
  domains?: EmailDomain[]
  placeholder?: string
  disabled?: boolean
  className?: string
  showDomainSelector?: boolean
}

export function GmailEmailInput({
  value,
  onChange,
  domain,
  onDomainChange,
  domains = GMAIL_DOMAINS,
  placeholder = "username",
  disabled = false,
  className,
  showDomainSelector = true,
}: GmailEmailInputProps) {
  // Sanitize input - only allow valid email username characters
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    onChange(sanitized)
  }

  return (
    <div
      className={cn(
        "flex items-center h-9 rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Google icon */}
      <div className="flex items-center justify-center h-full px-2.5 border-r border-input bg-muted/30 shrink-0">
        <GoogleIconMono className="h-4 w-4 text-foreground/60" />
      </div>

      {/* Username input */}
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="h-full border-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-3 min-w-0 flex-1"
      />

      {/* @ separator */}
      <div className="flex items-center justify-center h-full px-2 bg-muted/30 border-x border-input shrink-0">
        <span className="text-sm font-medium text-muted-foreground">@</span>
      </div>

      {/* Domain selector or static display */}
      {showDomainSelector && domains.length > 1 ? (
        <Select value={domain} onValueChange={onDomainChange} disabled={disabled}>
          <SelectTrigger className="h-full border-0 min-w-[120px] text-sm focus:ring-0 focus:ring-offset-0 rounded-none shrink-0 px-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {domains.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-sm">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center h-full px-3 text-sm text-muted-foreground shrink-0 min-w-[100px]">
          {domain}
        </div>
      )}
    </div>
  )
}

// Helper to get full email from username and domain
export function getFullEmail(username: string, domain: string): string {
  return username ? `${username}@${domain}` : ""
}
