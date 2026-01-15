"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { SectionCard, SectionCardHeader, SectionCardContent, ConfigField } from "@/components/ui/theme"

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <SectionCard>
      <SectionCardHeader
        icon={Sun}
        title="Appearance"
        description="Customize how ADAgentAI looks."
      />
      <SectionCardContent>
        <ConfigField
          label="Theme"
          description="Select your preferred color scheme."
        >
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
        </ConfigField>
      </SectionCardContent>
    </SectionCard>
  )
}
