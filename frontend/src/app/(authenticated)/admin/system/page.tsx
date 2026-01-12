"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Save, RotateCcw, AlertTriangle, Check, Clock,
  MessageSquare, Shield, Zap, Terminal, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  ConfigField,
  LoadingSpinner,
} from "@/components/ui/theme"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface SystemConfig {
  defaultResponseStyle: "concise" | "detailed"
  defaultContextMode: "soft" | "strict"
  toolExecutionTimeout: number
  maxTokensPerResponse: number
  safeModeDefault: boolean
  maintenanceMode: boolean
}

interface ConfigMetadata {
  [key: string]: {
    updatedAt: string
    updatedBy: string | null
  }
}

const DEFAULT_CONFIG: SystemConfig = {
  defaultResponseStyle: "detailed",
  defaultContextMode: "soft",
  toolExecutionTimeout: 30,
  maxTokensPerResponse: 4096,
  safeModeDefault: false,
  maintenanceMode: false,
}

export default function SystemPage() {
  const { getAccessToken, isLoading: userLoading } = useUser()
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [originalConfig, setOriginalConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [metadata, setMetadata] = useState<ConfigMetadata>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)

  const fetchConfig = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const res = await authFetch(`${API_URL}/api/admin/config`, token)
      if (!res.ok) throw new Error("Failed to fetch config")
      const data = await res.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
      setMetadata(data.metadata || {})
    } catch {
      setError("Failed to load configuration")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updates = Object.entries(config)
        .filter(([key, value]) => value !== originalConfig[key as keyof SystemConfig])
        .map(([key, value]) => ({ key, value }))

      if (updates.length === 0) {
        setSuccess("No changes to save")
        setSaving(false)
        return
      }

      const token = await getAccessToken()
      const res = await authFetch(`${API_URL}/api/admin/config`, token, {
        method: "PUT",
        body: JSON.stringify({ updates }),
      })

      if (!res.ok) throw new Error("Failed to save configuration")

      const data = await res.json()
      if (data.success) {
        setOriginalConfig(config)
        setSuccess("Configuration saved successfully")
        fetchConfig() // Refresh metadata
      } else {
        throw new Error(data.results?.find((r: { success: boolean }) => !r.success)?.error || "Save failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    setError(null)
    setSuccess(null)

    try {
      const token = await getAccessToken()
      const res = await authFetch(`${API_URL}/api/admin/config/reset`, token, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Failed to reset configuration")

      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
        setOriginalConfig(data.config)
        setMetadata({})
        setSuccess("Configuration reset to defaults")
      }
    } catch {
      setError("Failed to reset configuration")
    } finally {
      setResetting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (loading || userLoading) {
    return <LoadingSpinner label="Loading configuration..." />
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="System Configuration"
        description="Configure system-wide settings, timeouts, and feature flags"
      >
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
              Unsaved changes
            </span>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-8 text-xs"
                disabled={resetting}
              >
                <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all settings to their default values. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            className="gap-2 h-8 text-xs"
            disabled={!hasChanges || saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      {/* Status messages */}
      {error && (
        <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span className="text-xs text-rose-500">{error}</span>
        </div>
      )}
      {success && (
        <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-3">
          <Check className="h-4 w-4 text-emerald-500" />
          <span className="text-xs text-emerald-500">{success}</span>
        </div>
      )}

      {/* Response Settings */}
      <SectionCard>
        <SectionCardHeader
          icon={MessageSquare}
          title="Response Settings"
        />
        <SectionCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ConfigField
              label="Default Response Style"
              description="How detailed should AI responses be by default"
            >
              <Select
                value={config.defaultResponseStyle}
                onValueChange={(v) => setConfig(c => ({ ...c, defaultResponseStyle: v as "concise" | "detailed" }))}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise" className="text-xs">Concise</SelectItem>
                  <SelectItem value="detailed" className="text-xs">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>

            <ConfigField
              label="Default Context Mode"
              description="How strictly to enforce context in queries"
            >
              <Select
                value={config.defaultContextMode}
                onValueChange={(v) => setConfig(c => ({ ...c, defaultContextMode: v as "soft" | "strict" }))}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft" className="text-xs">Soft</SelectItem>
                  <SelectItem value="strict" className="text-xs">Strict</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
          </div>

          <ConfigField
            label="Max Tokens Per Response"
            description="Maximum number of tokens in AI responses (256 - 16,384)"
          >
            <Input
              type="number"
              min={256}
              max={16384}
              value={config.maxTokensPerResponse}
              onChange={(e) => setConfig(c => ({ ...c, maxTokensPerResponse: parseInt(e.target.value) || 4096 }))}
              className="w-28 h-8 text-xs font-mono"
            />
          </ConfigField>
          {metadata.maxTokensPerResponse?.updatedAt && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last modified {formatDate(metadata.maxTokensPerResponse.updatedAt)}</span>
            </div>
          )}
        </SectionCardContent>
      </SectionCard>

      {/* Execution Settings */}
      <SectionCard>
        <SectionCardHeader
          icon={Zap}
          title="Execution Settings"
        />
        <SectionCardContent>
          <ConfigField
            label="Tool Execution Timeout"
            description="Maximum time (in seconds) for tool execution before timeout (5 - 300)"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={300}
                value={config.toolExecutionTimeout}
                onChange={(e) => setConfig(c => ({ ...c, toolExecutionTimeout: parseInt(e.target.value) || 30 }))}
                className="w-20 h-8 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">seconds</span>
            </div>
          </ConfigField>
        </SectionCardContent>
      </SectionCard>

      {/* Safety Settings */}
      <SectionCard>
        <SectionCardHeader
          icon={Shield}
          title="Safety & Operations"
        />
        <SectionCardContent className="space-y-4">
          <ConfigField
            label="Safe Mode Default"
            description="Enable safe mode by default for all new sessions (requires tool approval)"
          >
            <Switch
              checked={config.safeModeDefault}
              onCheckedChange={(checked) => setConfig(c => ({ ...c, safeModeDefault: checked }))}
            />
          </ConfigField>

          <div className="border-t border-border/20 pt-4">
            <ConfigField
              label="Maintenance Mode"
              description="When enabled, the chat service will be unavailable to users"
              highlight={config.maintenanceMode}
            >
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(checked) => setConfig(c => ({ ...c, maintenanceMode: checked }))}
              />
            </ConfigField>
            {config.maintenanceMode && (
              <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-amber-500">
                  Users will not be able to access the chat service while maintenance mode is active.
                </span>
              </div>
            )}
          </div>
        </SectionCardContent>
      </SectionCard>

      {/* Footer with audit info */}
      <div className="text-center text-[10px] text-muted-foreground">
        <p>All configuration changes are logged to the admin audit trail</p>
      </div>
    </PageContainer>
  )
}
