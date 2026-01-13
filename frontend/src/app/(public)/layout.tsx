"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun, LayoutDashboard, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/hooks/use-user"
import { Logo } from "@/components/brand/logo"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, isLoading, signOut } = useUser()

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <div className="w-px h-4 bg-border/50 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse ml-1" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0 ml-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="h-8 text-sm ml-1">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-foreground/60">&copy; {new Date().getFullYear()} ADAgentAI</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-foreground/70 hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-foreground/70 hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
