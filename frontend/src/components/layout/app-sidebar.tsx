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
  User,
  LogOut,
  ChevronUp,
  PanelLeftClose,
  FileText,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  const router = useRouter()
  const { toggleSidebar, state } = useSidebar()
  const { user, isAdmin, signOut } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle New Chat click - force refresh when already in a chat
  const handleNewChatClick = (e: React.MouseEvent) => {
    if (pathname.startsWith('/chat')) {
      e.preventDefault()
      router.push('/chat')
      router.refresh()
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-12 flex flex-row items-center justify-between border-b border-border/40 px-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-background text-[10px] font-semibold shrink-0">
            AD
          </div>
          <span className="text-sm font-medium tracking-tight">
            ADAgent
          </span>
        </Link>
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
      </SidebarHeader>

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
                    className="h-8 text-xs"
                  >
                    <Link
                      href={item.url}
                      onClick={item.title === "New Chat" ? handleNewChatClick : undefined}
                    >
                      <item.icon className="h-3.5 w-3.5" />
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
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/settings" className="cursor-pointer">
                      <User className="mr-2 h-3.5 w-3.5" />
                      Account
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
