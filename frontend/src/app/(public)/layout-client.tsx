"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun, LayoutDashboard, LogOut, Menu, LogIn } from "lucide-react"
import { Button } from "@/atoms/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/atoms/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/molecules/dropdown-menu"
import { useUser } from "@/hooks/use-user"
import { Logo, LogoSvgWide } from "@/components/brand/logo"

interface PublicLayoutClientProps {
  children: React.ReactNode
  currentYear: number
}

export function PublicLayoutClient({
  children,
  currentYear,
}: PublicLayoutClientProps) {
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, isLoading, signOut } = useUser()

  return (
    <div className="min-h-screen flex flex-col bg-[#08090a]">
      {/* Linear-style Navigation */}
      <header className="sticky top-0 z-50 bg-[#08090a]/80 backdrop-blur-md border-b border-white/[0.05]">
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center px-6">
          {/* Logo - equal flex for true centering */}
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center">
              <Logo size="md" />
            </Link>
          </div>

          {/* Center nav links - fixed width, truly centered */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/platforms"
              className="px-3 py-1.5 text-[13.5px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100"
            >
              Platforms
            </Link>
            <Link
              href="/pricing"
              className="px-3 py-1.5 text-[13.5px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="px-3 py-1.5 text-[13.5px] font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100"
            >
              Blog
            </Link>
          </div>

          {/* Right side actions - equal flex for true centering */}
          <div className="flex-1 flex items-center justify-end gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.05] transition-colors duration-100"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </button>

            {/* User menu or sign in */}
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-white/[0.05] animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/[0.08] hover:ring-white/[0.15] transition-all duration-100">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-xs bg-[#1c1c1f] text-[#f7f8f8]">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#1c1c1f] border-white/[0.08]">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate text-[#f7f8f8]">{user.name}</p>
                    <p className="text-xs text-[#8a8f98] truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer text-[#b4bcd0] hover:text-[#f7f8f8]">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-400 focus:text-red-400">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                {/* Docs link - desktop only */}
                <Link
                  href="/blog"
                  className="hidden md:block px-3 py-1.5 text-[14px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100"
                >
                  Docs
                </Link>
                {/* Linear-style Sign in button - white bg, dark text */}
                <Link
                  href="/login"
                  className="hidden sm:flex h-8 px-3 items-center justify-center rounded-md text-[13px] font-medium bg-[#f7f8f8] text-[#08090a] hover:bg-white transition-colors duration-100"
                >
                  Sign in
                </Link>
              </>
            )}

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="md:hidden h-8 w-8 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.05] transition-colors duration-100">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-[#1c1c1f] border-white/[0.08]">
                <DropdownMenuItem asChild>
                  <Link href="/platforms" className="cursor-pointer text-[#b4bcd0]">Platforms</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer text-[#b4bcd0]">Pricing</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/blog" className="cursor-pointer text-[#b4bcd0]">Blog</Link>
                </DropdownMenuItem>
                {isAuthenticated && (
                  <>
                    <DropdownMenuSeparator className="bg-white/[0.08]" />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer text-[#b4bcd0]">Dashboard</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile sign in */}
            {!isAuthenticated && !isLoading && (
              <Link
                href="/login"
                className="sm:hidden h-8 w-8 flex items-center justify-center rounded-md bg-[#f7f8f8] text-[#08090a] hover:bg-white transition-colors duration-100"
              >
                <LogIn className="h-4 w-4" />
                <span className="sr-only">Sign in</span>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden">{children}</main>

      {/* Linear-style Footer */}
      <footer className="border-t border-white/[0.05] bg-[#08090a]">
        {/* Links Section */}
        <div className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Logo - icon only */}
            <div>
              <LogoSvgWide className="h-14 w-14 text-[#f7f8f8]" />
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[14px] font-semibold text-[#f7f8f8] mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/platforms" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Platforms
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[14px] font-semibold text-[#f7f8f8] mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/blog" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[14px] font-semibold text-[#f7f8f8] mb-4">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/blog" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Documentation
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@adagent.ai" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[14px] font-semibold text-[#f7f8f8] mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors duration-100">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
