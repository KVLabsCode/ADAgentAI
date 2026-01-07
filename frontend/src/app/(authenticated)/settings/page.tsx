"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Bell, Shield, User, MessageSquare } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useChatSettings } from "@/lib/chat-settings"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { displayMode, setDisplayMode } = useChatSettings()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your application preferences.
        </p>
      </div>

      {/* Chat Display */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Chat Display</h2>
            <p className="text-[10px] text-muted-foreground/60">Configure how agent activity is displayed.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Compact mode</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Show thinking and tool calls in a single combined box.
              </p>
            </div>
            <Switch
              checked={displayMode === "compact"}
              onCheckedChange={(checked) => setDisplayMode(checked ? "compact" : "detailed")}
            />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Sun className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Appearance</h2>
            <p className="text-[10px] text-muted-foreground/60">Customize how ADAgentAI looks.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Theme</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Select your preferred color scheme.
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="h-7 text-[11px] px-2"
              >
                <Sun className="h-3 w-3 mr-1" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="h-7 text-[11px] px-2"
              >
                <Moon className="h-3 w-3 mr-1" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className="h-7 text-[11px] px-2"
              >
                <Monitor className="h-3 w-3 mr-1" />
                System
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Notifications</h2>
            <p className="text-[10px] text-muted-foreground/60">Configure how you receive updates.</p>
          </div>
        </div>
        <div className="px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Email notifications</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Receive email updates about your ad performance.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="border-t border-border/20 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Weekly digest</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Get a weekly summary of your ad metrics.
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Privacy</h2>
            <p className="text-[10px] text-muted-foreground/60">Manage your data and privacy settings.</p>
          </div>
        </div>
        <div className="px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Usage analytics</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Help improve ADAgentAI by sharing anonymous usage data.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="border-t border-border/20 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Chat history</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Store conversation history for future reference.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Account</h2>
            <p className="text-[10px] text-muted-foreground/60">Manage your account settings.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-destructive">Delete Account</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                This will permanently delete your account and all associated data.
              </p>
            </div>
            <Button variant="destructive" size="sm" className="h-7 text-[11px]">
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
