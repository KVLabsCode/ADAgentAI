"use client"

import Link from "next/link"
import { LogOut, ChevronUp, Globe } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/organisms/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/molecules/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/atoms/avatar"

interface UserMenuProps {
  mounted: boolean
}

export function UserMenu({ mounted }: UserMenuProps) {
  const { user, signOut } = useUser()

  if (!mounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="h-9">
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
            <div className="grid flex-1 gap-1">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-2 w-28 bg-muted rounded animate-pulse" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
