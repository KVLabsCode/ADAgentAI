"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Save, RotateCcw, AlertTriangle, Clock
} from "lucide-react"
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import { Switch } from "@/atoms/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
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
} from "@/molecules/alert-dialog"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  ConfigField,
  ConfigFieldGroup,
  LoadingSpinner,
} from "@/organisms/theme"
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
      toast.error("Failed to load configuration")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setSaving(true)

    try {
      const updates = Object.entries(config)
        .filter(([key, value]) => value !== originalConfig[key as keyof SystemConfig])
        .map(([key, value]) => ({ key, value }))

      if (updates.length === 0) {
        toast.info("No changes to save")
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
        toast.success("Configuration saved")
        fetchConfig() // Refresh metadata
      } else {
        throw new Error(data.results?.find((r: { success: boolean }) => !r.success)?.error || "Save failed")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)

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
        toast.success("Configuration reset to defaults")
      }
    } catch {
      toast.error("Failed to reset configuration")
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

      {/* Sections container with proper gaps */}
      <div className="flex flex-col gap-[var(--section-gap)]">
        {/* Response Settings */}
        <SettingsSection title="Response Settings">
          <ConfigFieldGroup>
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
          </ConfigFieldGroup>
          {metadata.maxTokensPerResponse?.updatedAt && (
            <div className="flex items-center gap-2 text-[length:var(--text-small)] text-muted-foreground px-[var(--item-padding-x)] py-2">
              <Clock className="h-3 w-3" />
              <span>Last modified {formatDate(metadata.maxTokensPerResponse.updatedAt)}</span>
            </div>
          )}
        </SettingsSection>

        {/* Execution Settings */}
        <SettingsSection title="Execution Settings">
          <ConfigFieldGroup>
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
                <span className="text-[length:var(--text-small)] text-muted-foreground">seconds</span>
              </div>
            </ConfigField>
          </ConfigFieldGroup>
        </SettingsSection>

        {/* Safety Settings */}
        <SettingsSection title="Safety & Operations">
          <ConfigFieldGroup>
            <ConfigField
              label="Safe Mode Default"
              description="Enable safe mode by default for all new sessions (requires tool approval)"
            >
              <Switch
                checked={config.safeModeDefault}
                onCheckedChange={(checked) => setConfig(c => ({ ...c, safeModeDefault: checked }))}
              />
            </ConfigField>

            <ConfigField
              label="Maintenance Mode"
              description="When enabled, the chat service will be unavailable to users"
              highlight={config.maintenanceMode ? "warning" : undefined}
            >
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(checked) => setConfig(c => ({ ...c, maintenanceMode: checked }))}
              />
            </ConfigField>
          </ConfigFieldGroup>
          {config.maintenanceMode && (
            <div className="mx-[var(--item-padding-x)] mb-[var(--item-padding-y)] px-3 py-2 bg-warning/10 border border-warning/20 rounded-[5px] flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="text-[length:var(--text-small)] text-warning">
                Users will not be able to access the chat service while maintenance mode is active.
              </span>
            </div>
          )}
        </SettingsSection>
      </div>

      {/* Footer with audit info */}
      <div className="text-center text-[10px] text-muted-foreground mt-[var(--section-gap)]">
        <p>All configuration changes are logged to the admin audit trail</p>
      </div>
    </PageContainer>
  )
}
