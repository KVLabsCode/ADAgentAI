"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/atoms/button"
import { ConfigFieldGroup, ConfigField } from "@/organisms/theme"

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <ConfigFieldGroup>
      <ConfigField
        label="Theme"
        description="Select your preferred color scheme."
      >
        <div className="flex gap-1">
          <Button
            variant={theme === "light" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setTheme("light")}
            className="rounded-full"
            aria-label="Light theme"
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setTheme("dark")}
            className="rounded-full"
            aria-label="Dark theme"
          >
            <Moon className="h-4 w-4" />
          </Button>
          <Button
            variant={theme === "system" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setTheme("system")}
            className="rounded-full"
            aria-label="System theme"
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </ConfigField>
    </ConfigFieldGroup>
  )
}
