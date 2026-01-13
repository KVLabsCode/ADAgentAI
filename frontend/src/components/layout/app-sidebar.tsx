"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquarePlus,
  History,
  Plug,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  ChevronUp,
  PanelLeftClose,
  Users,
  User,
  Plus,
  Check,
  ChevronDown,
  Globe,
  Shield,
  BarChart3,
  MessageSquare,
  Cog,
  FileCode,
  PenSquare,
  UserPlus,
} from "lucide-react"
import { useUser } from "@/hooks/use-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Logo } from "@/components/brand/logo"

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Chat", url: "/chat", icon: MessageSquarePlus },
  { title: "Chat History", url: "/chat-history", icon: History },
  { title: "Providers", url: "/providers", icon: Plug },
]

const bottomNavItems = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Support", url: "/support", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
]

const adminNavItems = [
  { title: "Admin Home", url: "/admin", icon: Shield },
  { title: "Usage", url: "/admin/usage", icon: BarChart3 },
  { title: "Conversations", url: "/admin/conversations", icon: MessageSquare },
  { title: "System", url: "/admin/system", icon: Cog },
  { title: "Prompts", url: "/admin/prompts", icon: FileCode },
  { title: "Blog", url: "/dashboard/blog", icon: PenSquare },
  { title: "Waitlist", url: "/dashboard/waitlist", icon: UserPlus },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toggleSidebar, state } = useSidebar()
  const { user, isAdmin, signOut, selectedOrganization, selectedOrgRole, organizations, selectOrganization, createOrganization } = useUser()
  const [mounted, setMounted] = useState(false)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  // Handle New Chat click - forces fresh navigation even when already on /chat or /chat/[id]
  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault()
    // Clear any existing chat state in localStorage
    localStorage.removeItem('adagent_active_chat')
    // Force navigation by going to a dummy route then back, or use router.refresh
    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      // If already on chat, need to force a re-render
      router.push('/chat?new=' + Date.now())
    } else {
      router.push('/chat')
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateOrganization = async () => {
    if (organizations.length >= 1) {
      alert("Multiple organizations coming soon! For now, you can have one organization.")
      return
    }
    const name = prompt("Enter organization name:")
    if (!name) return
    setIsCreatingOrg(true)
    try {
      const newOrg = await createOrganization(name)
      if (newOrg) {
        selectOrganization(newOrg.id)
      }
    } catch (error) {
      // Handle Neon Auth organization limit error
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("maximum number of organizations")) {
        alert("Multiple organizations coming soon! For now, you can have one organization.")
      } else {
        console.error("Failed to create organization:", error)
        alert("Failed to create organization. Please try again.")
      }
    } finally {
      setIsCreatingOrg(false)
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-14 flex flex-row items-center justify-between border-b border-border/40 px-2">
        <Link
          href="/dashboard"
          className="pl-2 group-data-[collapsible=icon]:hidden"
        >
          <Logo size="md" />
        </Link>
        {/* Desktop: show tooltip, Mobile: no tooltip to prevent it staying open */}
        <div className="hidden md:block">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:mx-auto"
              >
                <PanelLeftClose className={`h-3.5 w-3.5 transition-transform ${state === "collapsed" ? "rotate-180" : ""}`} />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {state === "collapsed" ? "Expand" : "Collapse"} sidebar
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
        >
          <PanelLeftClose className={`h-3.5 w-3.5 transition-transform ${state === "collapsed" ? "rotate-180" : ""}`} />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SidebarHeader>

      {/* Organization Switcher */}
      {mounted && (
        <div className="px-2 py-2 border-b border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors group-data-[collapsible=icon]:justify-center">
                <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 bg-muted">
                  {selectedOrganization ? (
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 text-left truncate text-[13px] group-data-[collapsible=icon]:hidden">
                  {selectedOrganization?.name || "Personal"}
                  {selectedOrgRole && (
                    <span className="ml-1 text-[10px] text-muted-foreground capitalize">
                      ({selectedOrgRole})
                    </span>
                  )}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">
                Switch workspace
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => selectOrganization(null)}
                className="text-xs cursor-pointer"
              >
                <User className="h-3.5 w-3.5 mr-2" />
                Personal
                {!selectedOrganization && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
              {organizations.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">
                    Organizations
                  </DropdownMenuLabel>
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => selectOrganization(org.id)}
                      className="text-xs cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5 mr-2" />
                      <span className="truncate">{org.name}</span>
                      {selectedOrganization?.id === org.id && <Check className="h-3 w-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCreateOrganization}
                disabled={isCreatingOrg}
                className="text-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                {isCreatingOrg ? "Creating..." : "Create organization"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.title === "New Chat"
                      ? pathname === "/chat" && !pathname.includes("/chat/")
                      : pathname === item.url || pathname.startsWith(item.url + "/")}
                    tooltip={item.title}
                    className="h-8 text-xs"
                  >
                    {item.title === "New Chat" ? (
                      <Link href="/chat" onClick={handleNewChat}>
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.title}</span>
                      </Link>
                    ) : (
                      <Link href={item.url}>
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <div className="my-2 h-px bg-border/40" />
            <SidebarGroup className="p-0">
              <div className="flex items-center gap-1.5 px-2 mb-1.5 group-data-[collapsible=icon]:justify-center">
                <Shield className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                  Admin
                </span>
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {adminNavItems.map((item) => {
                    // For /admin, only exact match (not /admin/usage etc.)
                    const isActive = item.url === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.url || pathname.startsWith(item.url + "/")
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className="h-8 text-xs"
                        >
                          <Link href={item.url}>
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <div className="my-2 h-px bg-border/40" />

        <SidebarGroup className="p-0 mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-8 text-xs"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className="h-9 data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="h-5 w-5 rounded">
                      <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                      <AvatarFallback className="rounded bg-muted text-[10px] font-medium">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-normal">
                      <span className="truncate text-xs font-medium leading-tight">{user?.name || 'User'}</span>
                      <span className="truncate text-[10px] text-muted-foreground leading-normal pb-0.5">
                        {user?.email || ''}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-48"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link href="/?view=public">
                      <Globe className="mr-2 h-3.5 w-3.5" />
                      Visit Website
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton className="h-9">
                <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                <div className="grid flex-1 gap-1">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-28 bg-muted rounded animate-pulse" />
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
