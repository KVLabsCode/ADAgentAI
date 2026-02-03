"use client"

import * as React from "react"
import { ArrowUp, Square, Database } from "lucide-react"
import { Button } from "@/atoms/button"
import { PopoverTrigger } from "@/molecules/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/molecules/tooltip"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/molecules/dialog"
import { cn } from "@/lib/utils"
import { CommandPaletteContent } from "./command-palette/chat-command-palette"
import { useCommandPalette } from "./command-palette/use-command-palette"
import type { InlineMention } from "./command-palette/use-command-palette"
import { ContextBadges } from "./badges/context-badges"
import { PromptInput } from "@/molecules/prompt-input"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Provider, ProviderApp } from "@/lib/types"

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isLoading?: boolean
  isLoadingProviders?: boolean
  placeholder?: string
  providers?: Provider[]
  isCentered?: boolean
  children?: React.ReactNode
}

// Provider context indicator with tooltip showing what LLM has loaded
function ProviderContext({ providers, isLoading }: { providers: Provider[], isLoading?: boolean }) {
  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 animate-pulse">
        <div className="h-3 w-3 rounded bg-muted-foreground/20" />
        <div className="h-3 w-20 rounded bg-muted-foreground/20" />
      </div>
    )
  }

  if (providers.length === 0) return null

  const connectedProviders = providers.filter(p => p.status === "connected")
  if (connectedProviders.length === 0) return null

  // For single provider, show publisher ID
  const singleProvider = connectedProviders.length === 1 ? connectedProviders[0] : null
  const isAdMob = !!singleProvider?.identifiers.publisherId
  const rawId = singleProvider?.identifiers.publisherId || singleProvider?.identifiers.networkCode || ""
  const cleanId = rawId.replace(/^accounts\//, "")
  const providerName = isAdMob ? "AdMob" : "Ad Manager"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors cursor-default select-none">
            <Database className="h-3 w-3 text-muted-foreground/70" />
            {singleProvider ? (
              <span className="text-[10px] text-muted-foreground">
                <span className="font-medium">{providerName}</span>
                {cleanId && (
                  <span className="ml-1 text-muted-foreground/60 font-mono">{cleanId}</span>
                )}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                <span className="font-medium">{connectedProviders.length}</span>
                <span className="ml-1 text-muted-foreground/70">accounts</span>
              </span>
            )}
          </div>
        }
      />
      <TooltipContent side="top" align="start" className="max-w-xs p-0">
        <div className="px-3 py-2 border-b border-border/30">
          <p className="text-xs font-medium">Connected Accounts</p>
          <p className="text-[10px] text-muted-foreground">Data available to the assistant</p>
        </div>
        <div className="px-3 py-2 space-y-1.5">
          {connectedProviders.map(p => {
            const isAdMob = !!p.identifiers.publisherId
            const rawId = p.identifiers.publisherId || p.identifiers.networkCode || ""
            const id = rawId.replace(/^accounts\//, "")
            const name = isAdMob ? "AdMob" : "Ad Manager"
            return (
              <div key={p.id} className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium">{name}</span>
                <code className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                  {id}
                </code>
              </div>
            )
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isLoading = false,
  isLoadingProviders = false,
  placeholder = "Type your message...",
  providers = [],
  isCentered = false,
  children,
}: ChatInputProps) {
  const [value, setValue] = React.useState("")
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRangeRef = React.useRef<Range | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { getAccessToken } = useUser()

  // Provider apps state (fetched on demand)
  const [providerApps, setProviderApps] = React.useState<Record<string, ProviderApp[]>>({})
  const [loadingApps, setLoadingApps] = React.useState<Set<string>>(new Set())

  // Get provider name by ID
  const getProviderName = React.useCallback((providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    return provider?.displayName || "Unknown"
  }, [providers])

  // Get the plain text content from the editor (excludes badge markup)
  const getEditorText = React.useCallback(() => {
    const editor = editorRef.current
    if (!editor) return ""

    // Get text content, replacing badge elements with their @mention text
    let text = ""
    editor.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ""
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.dataset.mentionId) {
          // This is a mention badge - use its data attribute for the mention text
          text += `@${el.dataset.mentionName} `
        } else {
          text += el.textContent || ""
        }
      }
    })
    return text
  }, [])

  // Handle inserting inline mention (keyboard "@" mode) - insert badge directly into editor
  const handleInsertMention = React.useCallback((mention: InlineMention) => {
    const editor = editorRef.current
    if (!editor) return

    // Build path based on type
    let path = mention.name
    if (mention.type === "app") {
      // Find which provider this app belongs to
      for (const [providerId, apps] of Object.entries(providerApps)) {
        if (apps.some(app => app.id === mention.id)) {
          const providerName = getProviderName(providerId)
          path = `${providerName} › ${mention.name}`
          break
        }
      }
    }

    // Create badge element with variant colors based on type
    const badge = document.createElement("span")
    badge.contentEditable = "false"
    badge.dataset.mentionId = mention.id
    badge.dataset.mentionName = mention.name
    badge.dataset.mentionType = mention.type
    badge.dataset.mentionSubtype = mention.subtype || ""
    badge.dataset.mentionPath = path

    // Use same colors as context badges - provider vs app
    const colorClasses = mention.type === "provider"
      ? "bg-badge-provider/15 text-badge-provider border-badge-provider/30"
      : "bg-badge-app/15 text-badge-app border-badge-app/30"

    badge.className = `inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 text-xs font-medium rounded-md border align-middle select-none ${colorClasses}`
    badge.innerHTML = `<span>${path}</span>`

    // Focus editor first
    editor.focus()

    // Use saved range (from when @ was pressed) or current selection
    let range = savedRangeRef.current
    if (!range) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0)
      }
    }

    if (range) {
      // Restore selection to saved position
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }

      // Insert badge
      range.deleteContents()
      range.insertNode(badge)

      // Add a space after and move cursor
      const space = document.createTextNode("\u00A0") // Non-breaking space
      range.setStartAfter(badge)
      range.insertNode(space)
      range.setStartAfter(space)
      range.collapse(true)

      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    } else {
      // Fallback: append at end
      editor.appendChild(badge)
      editor.appendChild(document.createTextNode("\u00A0"))
    }

    // Clear saved range
    savedRangeRef.current = null

    // Update value state
    setValue(getEditorText())
  }, [providerApps, getProviderName, getEditorText])

  // Command palette hook
  const {
    isOpen: isPaletteOpen,
    setIsOpen: setIsPaletteOpen,
    triggerMode,
    openFromButton,
    selectedContext,
    enabledProviderIds: _enabledProviderIds,
    removeFromContext,
    handleKeyDown: handlePaletteKeyDown,
    toggleProvider,
    toggleApp,
    selectForInline,
  } = useCommandPalette({ providers, providerApps, onInsertMention: handleInsertMention })

  // Fetch apps for a provider
  const fetchApps = React.useCallback(
    async (providerId: string) => {
      if (providerApps[providerId] || loadingApps.has(providerId)) return
      setLoadingApps((prev) => new Set(prev).add(providerId))
      try {
        const accessToken = await getAccessToken()
        const response = await authFetch(`/api/providers/${providerId}/apps`, accessToken)
        if (response.ok) {
          const data = await response.json()
          setProviderApps((prev) => ({ ...prev, [providerId]: data.apps || [] }))
        }
      } catch (error) {
        console.error("Failed to fetch apps:", error)
      } finally {
        setLoadingApps((prev) => {
          const next = new Set(prev)
          next.delete(providerId)
          return next
        })
      }
    },
    [providerApps, loadingApps, getAccessToken]
  )

  // Fetch apps for all providers on mount
  React.useEffect(() => {
    providers.forEach((provider) => {
      fetchApps(provider.id)
    })
  }, [providers, fetchApps])

  // Click-outside handler to close palette (only for non-centered mode)
  React.useEffect(() => {
    if (!isPaletteOpen || isCentered) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false)
      }
    }

    // Use mousedown for faster response
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isPaletteOpen, isCentered, setIsPaletteOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = getEditorText().trim()
    if (!text || disabled || isLoading) return
    onSend(text)
    setValue("")
    // Clear editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = ""
    }
  }

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const text = getEditorText()

    // Save cursor position before @ triggers popup (focus will be lost)
    if (e.key === "@") {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange()
      }
    }

    // Check for command palette trigger (@)
    handlePaletteKeyDown(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>, text)

    // Submit on Enter (without shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Handle editor input to sync value state
  const handleEditorInput = React.useCallback(() => {
    setValue(getEditorText())
  }, [getEditorText])

  // Handle paste - strip formatting and insert plain text only
  const handleEditorPaste = React.useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    if (text) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      setValue(getEditorText())
    }
  }, [getEditorText])

  const hasProviders = providers.length > 0

  // Button mode: full palette with multi-select
  const paletteContentFull = (
    <CommandPaletteContent
      providers={providers}
      providerApps={providerApps}
      selectedContext={selectedContext}
      onToggleProvider={toggleProvider}
      onToggleApp={toggleApp}
    />
  )

  // Keyboard mode: same palette but single-select behavior
  const paletteContentInline = (
    <CommandPaletteContent
      providers={providers}
      providerApps={providerApps}
      selectedContext={selectedContext}
      onToggleProvider={toggleProvider}
      onToggleApp={toggleApp}
      singleSelectMode={true}
      onSingleSelect={selectForInline}
    />
  )

  // Save selection before opening popup via button
  const handleMentionButtonClick = React.useCallback(() => {
    // Save current cursor position in editor before opening popup
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange()
    }
    openFromButton()
  }, [openFromButton])

  // Shared @ button (different wrappers for Dialog vs Popover)
  const mentionButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-md hover:bg-muted/50 font-medium text-base text-muted-foreground"
      disabled={!hasProviders}
      onClick={handleMentionButtonClick}
    >
      @
      <span className="sr-only">Mention provider or app</span>
    </Button>
  )

  // Render the form input area
  const renderFormContent = (mode: "dialog" | "popover", dropdownAttached = false) => (
    <PromptInput
      disabled={disabled}
      className={cn(
        "border border-border/50 bg-zinc-100 dark:bg-zinc-900/80 p-0",
        "shadow-lg shadow-black/10 dark:shadow-xl dark:shadow-black/40",
        "transition-[border-radius] duration-200",
        dropdownAttached
          ? "rounded-b-xl rounded-t-none border-t-0"
          : "rounded-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
      )}
    >
      <form onSubmit={handleSubmit}>
        {/* Contenteditable input with inline badge support */}
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable={!disabled && !(isLoading && !onStop)}
            onInput={handleEditorInput}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
            data-testid="chat-input"
            data-placeholder={placeholder}
            className={cn(
              "min-h-[44px] max-h-[200px] overflow-y-auto px-4 py-3 text-sm",
              "bg-transparent outline-none",
              "text-foreground caret-current",
              "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground/40",
              (disabled || (isLoading && !onStop)) && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          />
        </div>
        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-0">
          <div className="flex items-center gap-2">
            <ContextBadges
              items={selectedContext}
              onRemove={removeFromContext}
              onAddClick={openFromButton}
            />
            <ProviderContext providers={providers} isLoading={isLoadingProviders} />
          </div>
          <div className="flex items-center gap-2">
            {mode === "dialog" ? (
              <DialogTrigger render={mentionButton}>{null}</DialogTrigger>
            ) : (
              <PopoverTrigger render={mentionButton}>{null}</PopoverTrigger>
            )}
            <Button
              type={isLoading ? "button" : "submit"}
              size="icon"
              disabled={disabled || (!isLoading && !value.trim())}
              onClick={(e) => {
                if (isLoading && onStop) {
                  e.preventDefault()
                  onStop()
                }
              }}
              className={cn(
                "h-7 w-7 rounded-lg cursor-pointer",
                "transition-[opacity,background-color] duration-150",
                (value.trim() || isLoading) && !disabled
                  ? "opacity-100 bg-foreground text-background hover:bg-foreground/90"
                  : "opacity-30 bg-muted-foreground/50 text-muted"
              )}
            >
              {isLoading ? (
                <Square className="h-3 w-3 fill-current" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">{isLoading ? "Stop generating" : "Send message"}</span>
            </Button>
          </div>
        </div>
      </form>
    </PromptInput>
  )

  // Centered mode: use Dialog (modal, appears from center relative to content area)
  if (isCentered) {
    return (
      <div className="space-y-4">
        {children}
        <Dialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
          {renderFormContent("dialog")}
          <DialogContent
            showCloseButton={false}
            className={cn(
              "w-full max-w-xl sm:max-w-xl p-0",
              "border border-border/50 bg-zinc-100 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl rounded-xl",
              "sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2"
            )}
          >
            <DialogTitle className="sr-only">Command Palette</DialogTitle>
            {triggerMode === "keyboard" ? paletteContentInline : paletteContentFull}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Normal mode: unified card with dropdown above input (no portal)
  return (
    <div className="space-y-3">
      {/* Single container with shadow - both dropdown and input inside */}
      <div
        ref={containerRef}
        className={cn(
          "rounded-xl overflow-hidden",
          "border border-border/50 bg-zinc-100 dark:bg-zinc-900",
          "shadow-lg shadow-black/10 dark:shadow-xl dark:shadow-black/40",
          "ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
        )}
      >
        {/* Dropdown content - conditionally rendered above input */}
        {isPaletteOpen && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            {triggerMode === "keyboard" ? paletteContentInline : paletteContentFull}
            {/* Separator line */}
            <div className="h-px bg-border/40" />
          </div>
        )}

        {/* Input form - always rendered */}
        <form onSubmit={handleSubmit}>
            <div className="relative">
              <div
                ref={editorRef}
                contentEditable={!disabled && !(isLoading && !onStop)}
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                onPaste={handleEditorPaste}
                data-testid="chat-input"
                data-placeholder={placeholder}
                className={cn(
                  "min-h-[44px] max-h-[200px] overflow-y-auto px-4 py-3 text-sm",
                  "bg-transparent outline-none",
                  "text-foreground caret-current",
                  "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground/40",
                  (disabled || (isLoading && !onStop)) && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              />
            </div>
            <div className="flex items-center justify-between px-2.5 pb-2.5 pt-0">
              <div className="flex items-center gap-2">
                <ContextBadges
                  items={selectedContext}
                  onRemove={removeFromContext}
                  onAddClick={openFromButton}
                />
                <ProviderContext providers={providers} isLoading={isLoadingProviders} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-muted/50 font-medium text-base text-muted-foreground"
                  disabled={!hasProviders}
                  onClick={handleMentionButtonClick}
                >
                  @
                  <span className="sr-only">Mention provider or app</span>
                </Button>
                <Button
                  type={isLoading ? "button" : "submit"}
                  size="icon"
                  disabled={disabled || (!isLoading && !value.trim())}
                  onClick={(e) => {
                    if (isLoading && onStop) {
                      e.preventDefault()
                      onStop()
                    }
                  }}
                  className={cn(
                    "h-7 w-7 rounded-lg cursor-pointer",
                    "transition-[opacity,background-color] duration-150",
                    (value.trim() || isLoading) && !disabled
                      ? "opacity-100 bg-foreground text-background hover:bg-foreground/90"
                      : "opacity-30 bg-muted-foreground/50 text-muted"
                  )}
                >
                  {isLoading ? (
                    <Square className="h-3 w-3 fill-current" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">{isLoading ? "Stop generating" : "Send message"}</span>
                </Button>
              </div>
            </div>
          </form>
      </div>
    </div>
  )
}
