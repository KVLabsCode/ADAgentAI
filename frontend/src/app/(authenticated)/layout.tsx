"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-6 w-11 rounded-full bg-muted/50 animate-pulse" />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-6 w-11 rounded-full p-0.5 transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDark ? "bg-slate-700" : "bg-amber-100"
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Sliding circle with icon */}
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-all duration-300 ease-in-out",
          isDark
            ? "translate-x-5 bg-slate-900"
            : "translate-x-0 bg-white"
        )}
      >
        <Sun
          className={cn(
            "h-3 w-3 text-amber-500 transition-all duration-300",
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute h-3 w-3 text-slate-300 transition-all duration-300",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          )}
        />
      </span>
    </button>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-end border-b border-border/40 px-3">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
