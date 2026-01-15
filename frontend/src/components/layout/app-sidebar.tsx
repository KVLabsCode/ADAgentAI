"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PanelLeftClose, Shield } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Logo } from "@/components/brand/logo"
import { OrganizationSwitcher } from "./OrganizationSwitcher"
import { UserMenu } from "./UserMenu"
import { mainNavItems, bottomNavItems, adminNavItems } from "@/constants/navigation"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toggleSidebar, state } = useSidebar()
  const { isAdmin } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Handle New Chat click - forces fresh navigation even when already on /chat or /chat/[id]
  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('adagent_active_chat')
    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      router.push('/chat?new=' + Date.now())
    } else {
      router.push('/chat')
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

      {mounted && <OrganizationSwitcher />}

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
        <UserMenu mounted={mounted} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
