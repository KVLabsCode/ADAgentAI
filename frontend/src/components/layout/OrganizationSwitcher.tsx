"use client"

import * as React from "react"
import {
  Users,
  User,
  Plus,
  Check,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/molecules/dropdown-menu"
import { useUser } from "@/hooks/use-user"

export function OrganizationSwitcher() {
  const {
    selectedOrganization,
    selectedOrgRole,
    organizations,
    selectOrganization,
    createOrganization,
  } = useUser()
  const [isCreatingOrg, setIsCreatingOrg] = React.useState(false)

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
  )
}
