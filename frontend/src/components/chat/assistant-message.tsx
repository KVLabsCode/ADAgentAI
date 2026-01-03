"use client"

import { Badge } from "@/components/ui/badge"
import { DisclosureBlock } from "./disclosure-block"
import type { Message } from "@/lib/types"

interface AssistantMessageProps {
  message: Message
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  return (
    <div className="flex gap-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-foreground/5 text-foreground/70 text-[10px] font-medium border border-border/30">
        AI
      </div>

      <div className="flex-1 space-y-2 min-w-0 pt-0.5">
        {/* Agent Name Badge */}
        {message.agentName && (
          <Badge variant="secondary" className="font-normal text-[10px] h-5 px-1.5">
            {message.agentName}
          </Badge>
        )}

        {/* Main Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
            {message.content}
          </p>
        </div>

        {/* Disclosure Blocks */}
        <div className="space-y-2">
          {message.hasThinking && message.thinking && (
            <DisclosureBlock
              label="Show thinking"
              expandedLabel="Thinking"
              variant="thinking"
            >
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {message.thinking}
              </p>
            </DisclosureBlock>
          )}

          {message.hasToolCalls && message.toolCalls && message.toolCalls.length > 0 && (
            <DisclosureBlock
              label="Show tool calls"
              expandedLabel="Tool calls"
              variant="tool"
            >
              <div className="space-y-2">
                {message.toolCalls.map((tool, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {tool.name}
                    </span>
                    <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                      {JSON.stringify(tool.params, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </DisclosureBlock>
          )}

          {message.toolResults && message.toolResults.length > 0 && (
            <DisclosureBlock
              label="Show tool results"
              expandedLabel="Tool results"
              variant="result"
            >
              <div className="space-y-2">
                {message.toolResults.map((result, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {result.name}
                    </span>
                    <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </DisclosureBlock>
          )}
        </div>
      </div>
    </div>
  )
}
