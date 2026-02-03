"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PanelLeftClose, Shield, Sparkles } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { useDemo } from "@/contexts/demo-mode-context"
import { storage } from "@/lib/storage"

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
} from "@/organisms/sidebar"
import { Button } from "@/atoms/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/molecules/tooltip"
import { Logo } from "@/components/brand/logo"
import { OrganizationSwitcher } from "./OrganizationSwitcher"
import { UserMenu } from "./UserMenu"
import { mainNavItems, bottomNavItems, adminNavItems, demoNavItems } from "@/constants/navigation"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toggleSidebar, state } = useSidebar()
  const { isAdmin } = useUser()
  const { isDemoMode } = useDemo()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Handle New Chat click - forces fresh navigation even when already on /chat or /chat/[id]
  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault()
    storage.remove('adagent_active_chat')
    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      router.push('/chat?new=' + Date.now())
    } else {
      router.push('/chat')
    }
  }

  // Handle Demo Chat click - forces fresh navigation when already on demo chat
  const handleDemoChat = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === '/demo/chat') {
      router.push('/demo/chat?new=' + Date.now())
    } else {
      router.push('/demo/chat')
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
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:mx-auto"
                />
              }
            >
              <PanelLeftClose className={`h-3.5 w-3.5 transition-transform ${state === "collapsed" ? "rotate-180" : ""}`} />
              <span className="sr-only">Toggle sidebar</span>
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
                    render={item.title === "New Chat"
                      ? <Link href="/chat" onClick={handleNewChat} />
                      : <Link href={item.url} />
                    }
                    isActive={item.title === "New Chat"
                      ? pathname === "/chat" && !pathname.includes("/chat/")
                      : pathname === item.url || pathname.startsWith(item.url + "/")}
                    tooltip={item.title}
                    className="h-8 text-xs"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.title}</span>
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
              <div className="flex items-center gap-2 px-2 mb-2 group-data-[collapsible=icon]:justify-center">
                <Shield className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide group-data-[collapsible=icon]:hidden">
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
                          render={<Link href={item.url} />}
                          isActive={isActive}
                          tooltip={item.title}
                          className="h-8 text-xs"
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isDemoMode && (
          <>
            <div className="my-2 h-px bg-border/40" />
            <SidebarGroup className="p-0">
              <div className="flex items-center gap-2 px-2 mb-2 group-data-[collapsible=icon]:justify-center">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide group-data-[collapsible=icon]:hidden">
                  Demo
                </span>
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {demoNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={item.title === "Demo Chat"
                          ? <Link href={item.url} onClick={handleDemoChat} />
                          : <Link href={item.url} />
                        }
                        isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                        tooltip={item.title}
                        className="h-8 text-xs"
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.title}</span>
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
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-8 text-xs"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.title}</span>
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
