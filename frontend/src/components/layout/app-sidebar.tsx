"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  FileText,
  Users,
  User,
  Plus,
  Check,
  ChevronDown,
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
  { title: "Blog Admin", url: "/dashboard/blog", icon: FileText },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { toggleSidebar, state } = useSidebar()
  const { user, isAdmin, signOut, selectedOrganization, selectedOrgRole, organizations, selectOrganization, createOrganization } = useUser()
  const [mounted, setMounted] = useState(false)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateOrganization = async () => {
    const name = prompt("Enter organization name:")
    if (!name) return
    setIsCreatingOrg(true)
    try {
      const newOrg = await createOrganization(name)
      if (newOrg) {
        selectOrganization(newOrg.id)
      }
    } finally {
      setIsCreatingOrg(false)
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-12 flex flex-row items-center justify-between border-b border-border/40 px-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 pl-2 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-background text-[10px] font-semibold shrink-0">
            AD
          </div>
          <span className="text-sm font-medium tracking-tight">
            ADAgentAI
          </span>
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
                <div className="h-5 w-5 rounded flex items-center justify-center shrink-0 bg-muted">
                  {selectedOrganization ? (
                    <Users className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 text-left truncate text-xs group-data-[collapsible=icon]:hidden">
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
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    tooltip={item.title}
                    className="h-9 text-sm"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
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
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                        tooltip={item.title}
                        className="h-9 text-sm"
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                    className="h-9 text-sm"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
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
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-xs font-medium">{user?.name || 'User'}</span>
                      <span className="truncate text-[10px] text-muted-foreground">
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
