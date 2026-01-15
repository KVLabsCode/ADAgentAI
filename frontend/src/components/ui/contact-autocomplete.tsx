"use client"

import * as React from "react"
import Image from "next/image"
import { User, Loader2, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/api"
import { authClient } from "@/lib/neon-auth/client"

// Monochrome Google "G" logo - uses currentColor for theme compatibility
function GoogleIconMono({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export interface Contact {
  name: string | null
  email: string
  photo: string | null
}

interface ContactAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (contact: Contact) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  getAccessToken: () => Promise<string | null>
}

export function ContactAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
  placeholder = "username",
  className,
  getAccessToken,
}: ContactAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [loading, setLoading] = React.useState(false)
  const [scopeRequired, setScopeRequired] = React.useState(false)
  const [connectingContacts, setConnectingContacts] = React.useState(false)
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Parse username from email value
  const username = value.includes("@") ? value.split("@")[0] : value

  // Handle username input change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "")
    // Always append @gmail.com for the full email
    onChange(sanitized ? `${sanitized}@gmail.com` : "")
    // Clear selected contact when typing
    if (selectedContact) setSelectedContact(null)
  }

  // Track if we've done a search (to show hint after first attempt)
  const [hasSearched, setHasSearched] = React.useState(false)

  // Debounced search effect
  React.useEffect(() => {
    if (username.length < 2) {
      setContacts([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        const accessToken = await getAccessToken()
        const response = await authFetch(
          `${apiUrl}/api/account/contacts/search?q=${encodeURIComponent(username)}`,
          accessToken
        )
        const data = await response.json()
        setContacts(data.contacts || [])
        setHasSearched(true)

        // Check if scope is required (403 from Google)
        if (data.scopeRequired) {
          setScopeRequired(true)
        }

        if (data.contacts && data.contacts.length > 0) {
          setOpen(true)
        }
      } catch (e) {
        console.error("Failed to search contacts:", e)
        setContacts([])
        setHasSearched(true)
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [username, getAccessToken])

  const handleSelect = (contact: Contact) => {
    onChange(contact.email)
    setSelectedContact(contact)
    onSelect?.(contact)
    setOpen(false)
    setContacts([])
  }

  // Request contacts permission via linkSocial
  const handleConnectContacts = async () => {
    setConnectingContacts(true)
    try {
      await authClient.linkSocial({
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/contacts.readonly"],
      })
      // After redirect back, the scope should be granted
      setScopeRequired(false)
    } catch (e) {
      console.error("Failed to connect contacts:", e)
    } finally {
      setConnectingContacts(false)
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open && contacts.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex items-center h-9 rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Google icon or selected contact avatar */}
            <div className="flex items-center justify-center h-full px-2.5 border-r border-input bg-muted/30 shrink-0">
              {selectedContact?.photo ? (
                <Image
                  src={selectedContact.photo}
                  alt={selectedContact.name || "Contact"}
                  width={20}
                  height={20}
                  className="rounded-full"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <GoogleIconMono className="h-4 w-4 text-foreground/60" />
              )}
            </div>

            {/* Username input */}
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={username}
              onChange={handleUsernameChange}
              disabled={disabled}
              className="h-full border-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-3 min-w-0 flex-1"
              onFocus={() => {
                if (contacts.length > 0) setOpen(true)
              }}
            />

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center h-full px-2 shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* @ separator */}
            <div className="flex items-center justify-center h-full px-2 bg-muted/30 border-x border-input shrink-0">
              <span className="text-sm font-medium text-muted-foreground">@</span>
            </div>

            {/* Domain display */}
            <div className="flex items-center h-full px-3 text-sm text-muted-foreground shrink-0 min-w-[100px]">
              gmail.com
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>No contacts found</CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.email}
                    value={contact.email}
                    onSelect={() => handleSelect(contact)}
                    className="flex items-center gap-2 py-2"
                  >
                    {/* Avatar */}
                    {contact.photo ? (
                      <Image
                        src={contact.photo}
                        alt={contact.name || "Contact"}
                        width={28}
                        height={28}
                        className="rounded-full border border-border/50 shrink-0"
                        referrerPolicy="no-referrer"
                        unoptimized
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center border border-border/50 shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {contact.name && (
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.email}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Show connect button if scope is required OR after first search with no results */}
      {(scopeRequired || (hasSearched && contacts.length === 0 && !loading)) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleConnectContacts}
          disabled={connectingContacts}
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
        >
          {connectingContacts ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Users className="h-3 w-3" />
          )}
          {scopeRequired ? "Enable contact suggestions" : "Connect Google Contacts"}
        </Button>
      )}
    </div>
  )
}
