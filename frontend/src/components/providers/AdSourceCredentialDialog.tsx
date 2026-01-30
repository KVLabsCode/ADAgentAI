"use client"

import * as React from "react"
import { ExternalLink, Eye, EyeOff } from "lucide-react"
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import { Label } from "@/atoms/label"
import { Spinner } from "@/atoms/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/molecules/dialog"
import { NetworkLogo } from "@/components/icons/provider-logos"
import type { AdSourceName, AdSourceConfig } from "@/lib/types"

interface AdSourceCredentialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adSourceName: AdSourceName | null
  config: AdSourceConfig | null
  onConnect: (adSourceName: AdSourceName, credentials: Record<string, string>) => Promise<boolean>
  isConnecting: boolean
}

export function AdSourceCredentialDialog({
  open,
  onOpenChange,
  adSourceName,
  config,
  onConnect,
  isConnecting,
}: AdSourceCredentialDialogProps) {
  const [credentials, setCredentials] = React.useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = React.useState<Record<string, boolean>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Reset state when dialog opens with new ad source
  React.useEffect(() => {
    if (open && config) {
      const initial: Record<string, string> = {}
      config.fields.forEach(field => {
        initial[field.key] = ""
      })
      setCredentials(initial)
      setShowPasswords({})
      setErrors({})
    }
  }, [open, config])

  const handleFieldChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }))
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (config) {
      config.fields.forEach(field => {
        if (field.required && !credentials[field.key]?.trim()) {
          newErrors[field.key] = `${field.label} is required`
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !adSourceName) return

    const success = await onConnect(adSourceName, credentials)
    if (success) {
      onOpenChange(false)
    }
  }

  if (!config || !adSourceName) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:left-[calc(50%+var(--sidebar-width)/2)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <NetworkLogo network={adSourceName} size="md" />
            <div>
              <DialogTitle className="text-base">Connect {config.displayName}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-xs">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={field.key}
                    type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                    value={credentials[field.key] || ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className={`text-sm pr-10 ${errors[field.key] ? "border-destructive" : ""}`}
                    disabled={isConnecting}
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(field.key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPasswords[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                {errors[field.key] && (
                  <p className="text-xs text-destructive">{errors[field.key]}</p>
                )}
                {field.helpText && !errors[field.key] && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}

            {config.docsUrl && (
              <a
                href={config.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View documentation
              </a>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConnecting}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isConnecting} size="sm">
              {isConnecting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Legacy export for backward compatibility
export { AdSourceCredentialDialog as NetworkCredentialDialog }
