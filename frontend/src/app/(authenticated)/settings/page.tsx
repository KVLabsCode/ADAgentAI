"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Bell, Shield, User, MessageSquare, Brain } from "lucide-react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useChatSettings } from "@/lib/chat-settings"

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
    <div className="flex-1 overflow-y-auto">
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto pb-12">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your application preferences.
        </p>
      </div>

      {/* Chat Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat Display
          </CardTitle>
          <CardDescription>
            Configure how agent activity is displayed in chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Compact mode</p>
              <p className="text-xs text-muted-foreground">
                Show thinking and tool calls in a single combined box instead of separate blocks.
              </p>
            </div>
            <Switch
              checked={displayMode === "compact"}
              onCheckedChange={(checked) => setDisplayMode(checked ? "compact" : "detailed")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how ADAgent looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Select your preferred color scheme.
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="h-8"
              >
                <Sun className="h-3.5 w-3.5 mr-1.5" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="h-8"
              >
                <Moon className="h-3.5 w-3.5 mr-1.5" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className="h-8"
              >
                <Monitor className="h-3.5 w-3.5 mr-1.5" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive email updates about your ad performance.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Weekly digest</p>
              <p className="text-xs text-muted-foreground">
                Get a weekly summary of your ad metrics.
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </CardTitle>
          <CardDescription>
            Manage your data and privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Usage analytics</p>
              <p className="text-xs text-muted-foreground">
                Help improve ADAgent by sharing anonymous usage data.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Chat history</p>
              <p className="text-xs text-muted-foreground">
                Store conversation history for future reference.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>
            Manage your account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm">
            Delete Account
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will permanently delete your account and all associated data.
          </p>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
