"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileCode, Copy, Check, ExternalLink, Terminal,
  Router, Smartphone, LayoutGrid, HelpCircle, Database,
  ChevronDown, ChevronRight, Pencil, History
} from "lucide-react"
import { Button } from "@/atoms/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/molecules/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  ErrorCard,
} from "@/organisms/theme"

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:5001"

interface PromptData {
  id: string
  title: string
  description: string
  content: string
  version: string
  lastUpdated: string
  metadata?: Record<string, unknown>
}

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  router: <Router className="h-4 w-4" />,
  admob_specialist: <Smartphone className="h-4 w-4" />,
  admanager_specialist: <LayoutGrid className="h-4 w-4" />,
  general_assistant: <HelpCircle className="h-4 w-4" />,
  entity_grounding: <Database className="h-4 w-4" />,
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set(["router"]))

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_URL}/chat/prompts`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch prompts")
      const data = await res.json()
      setPrompts(data.prompts || [])
    } catch {
      setError("Failed to load prompts. Make sure the chat agent is running.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const togglePrompt = (id: string) => {
    setExpandedPrompts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Terminal className="h-5 w-5 animate-pulse" />
            <span className="text-xs">Loading prompts...</span>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Agent Prompts"
        description="View current agent prompts for debugging and transparency"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-2"
                onClick={() => window.open("https://smith.langchain.com", "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in LangSmith
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View traces and debug agent runs</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PageHeader>

      {/* Error state */}
      {error && (
        <ErrorCard title="Error" message={error} />
      )}

      {/* Prompts list */}
      <SettingsSection title="System Prompts">
        <div className="divide-y divide-[color:var(--item-divider)]">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isExpanded={expandedPrompts.has(prompt.id)}
              onToggle={() => togglePrompt(prompt.id)}
              onCopy={() => copyToClipboard(prompt.content, prompt.id)}
              isCopied={copiedId === prompt.id}
            />
          ))}
        </div>
      </SettingsSection>

      {/* Footer */}
      <div className="text-center text-[length:var(--text-small)] text-muted-foreground py-4">
        <p>Prompts are loaded from the chat agent service. Changes require a backend deployment.</p>
      </div>
    </PageContainer>
  )
}

function PromptCard({
  prompt,
  isExpanded,
  onToggle,
  onCopy,
  isCopied,
}: {
  prompt: PromptData
  isExpanded: boolean
  onToggle: () => void
  onCopy: () => void
  isCopied: boolean
}) {
  const icon = PROMPT_ICONS[prompt.id] || <FileCode className="h-4 w-4" />

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full px-[var(--item-padding-x)] py-[var(--item-padding-y)] flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-[var(--item-gap)]">
            <div className="p-2 rounded border border-[color:var(--card-border)] text-muted-foreground">
              {icon}
            </div>
            <div className="text-left">
              <h3 className="text-[length:var(--text-label)] font-medium">{prompt.title}</h3>
              <p className="text-[length:var(--text-description)] text-muted-foreground">{prompt.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-[length:var(--text-small)] text-muted-foreground">
              <div>v{prompt.version}</div>
              <div>{prompt.lastUpdated}</div>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-[color:var(--item-divider)]">
          {/* Actions bar */}
          <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)] bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[length:var(--text-small)] gap-2"
                      onClick={onCopy}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Prompt
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy prompt content to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[length:var(--text-small)] gap-2 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[length:var(--text-small)] gap-2 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <History className="h-3.5 w-3.5" />
                      History
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <span className="text-[length:var(--text-small)] text-muted-foreground">
              {prompt.content.length} characters
            </span>
          </div>

          {/* Prompt content */}
          <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
            <pre className="p-3 bg-muted/30 rounded border border-[color:var(--card-border)] overflow-x-auto text-[length:var(--text-small)] font-mono text-foreground whitespace-pre-wrap">
              {prompt.content}
            </pre>

            {/* Metadata section if exists */}
            {prompt.metadata && Object.keys(prompt.metadata).length > 0 && (
              <div className="mt-3 p-3 bg-muted/20 rounded border border-[color:var(--card-border)]">
                <h4 className="text-[length:var(--text-small)] font-semibold text-muted-foreground uppercase mb-2">Metadata</h4>
                <pre className="text-[length:var(--text-small)] font-mono text-muted-foreground overflow-x-auto">
                  {JSON.stringify(prompt.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
