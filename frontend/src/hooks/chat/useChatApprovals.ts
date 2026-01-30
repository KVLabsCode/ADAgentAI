"use client"

import * as React from "react"
import type { Message, StreamEventItem, RJSFSchema } from "@/lib/types"
import { approveTool, resumeStream } from "@/lib/api"
import { extractMcpContent } from "@/lib/step-utils"

// Extract pending approval states from messages
// Returns Map<approvalId, boolean | null> where null = still pending
export function extractPendingApprovals(messages: Message[]): Map<string, boolean | null> {
  const approvals = new Map<string, boolean | null>()

  for (const message of messages) {
    if (!message.events) continue

    let currentApprovalId: string | null = null

    for (const event of message.events) {
      if (event.type === "tool_approval_required") {
        if (currentApprovalId && !approvals.has(currentApprovalId)) {
          approvals.set(currentApprovalId, null)
        }
        currentApprovalId = event.approval_id
      } else if (event.type === "tool_result" && currentApprovalId) {
        approvals.set(currentApprovalId, true)
        currentApprovalId = null
      } else if (event.type === "tool_denied" && currentApprovalId) {
        approvals.set(currentApprovalId, false)
        currentApprovalId = null
      }
    }

    if (currentApprovalId && !approvals.has(currentApprovalId)) {
      approvals.set(currentApprovalId, null)
    }
  }

  return approvals
}

interface UseChatApprovalsOptions {
  getAccessToken: () => Promise<string | null>
  currentStreamIdRef: React.MutableRefObject<string | null>
  currentAssistantIdRef: React.MutableRefObject<string | null>
  abortControllerRef: React.MutableRefObject<AbortController | null>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export function useChatApprovals({
  getAccessToken,
  currentStreamIdRef,
  currentAssistantIdRef,
  abortControllerRef,
  setMessages,
  setIsLoading,
}: UseChatApprovalsOptions) {
  const [pendingApprovals, setPendingApprovals] = React.useState<Map<string, boolean | null>>(new Map())

  const handleToolApproval = React.useCallback(async (
    approvalId: string,
    approved: boolean,
    modifiedParams?: Record<string, unknown>
  ) => {
    // Optimistically update UI
    setPendingApprovals(prev => {
      const newMap = new Map(prev)
      newMap.set(approvalId, approved)
      return newMap
    })

    try {
      const result = await approveTool(approvalId, approved, modifiedParams)
      if (!result.success) {
        console.error(`Failed to ${approved ? 'approve' : 'deny'} tool:`, result.error)

        if (result.expired) {
          alert("This approval has expired. Please send a new message to try again.")
        }

        // Revert on failure
        setPendingApprovals(prev => {
          const newMap = new Map(prev)
          newMap.set(approvalId, null)
          return newMap
        })
        return
      }

      // Resume the graph if we have stream/assistant IDs
      if (currentStreamIdRef.current && currentAssistantIdRef.current) {
        const streamId = currentStreamIdRef.current
        const assistantId = currentAssistantIdRef.current
        const accessToken = await getAccessToken()

        setIsLoading(true)

        let finalContent = ""
        const resumeEvents: StreamEventItem[] = []

        // Get existing events
        const existingMessage = await new Promise<Message | undefined>(resolve => {
          setMessages(prev => {
            const msg = prev.find(m => m.id === assistantId)
            resolve(msg)
            return prev
          })
        })
        if (existingMessage?.events) {
          resumeEvents.push(...existingMessage.events)
        }

        // Find the tool name from the SPECIFIC approval event we're resuming (match by approvalId)
        // This is needed because onToolResult may be called without a preceding onToolCall
        // (the tool was already called before approval was requested)
        let lastToolName = "unknown"
        for (const e of resumeEvents) {
          if (e.type === "tool_approval_required" && e.approval_id === approvalId) {
            lastToolName = e.tool_name
            break
          }
        }

        await resumeStream(
          streamId,
          approved,
          {
            onToolExecuting: (toolName, message) => {
              // Add tool_executing event for progress UI
              resumeEvents.push({ type: "tool_executing", tool_name: toolName, message })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, events: [...resumeEvents] } : m
                )
              )
            },
            onThinking: (thinkingContent) => {
              resumeEvents.push({ type: "thinking", content: thinkingContent })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, events: [...resumeEvents] } : m
                )
              )
            },
            onToolCall: (tool, inputPreview, inputFull, toolApproved) => {
              let params: Record<string, unknown> = {}
              try {
                const inputStr = inputFull || inputPreview
                if (inputStr) params = JSON.parse(inputStr)
              } catch {
                params = { input: inputPreview }
              }
              lastToolName = tool
              resumeEvents.push({ type: "tool", name: tool, params, approved: toolApproved })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, events: [...resumeEvents] } : m
                )
              )
            },
            onToolResult: (toolName, preview, full, dataType) => {
              // Use tool name from event (passed by backend) - falls back to lastToolName for backwards compat
              const resolvedToolName = toolName !== "unknown" ? toolName : lastToolName
              let toolResult: unknown = preview
              if (dataType === "json" || dataType === "json_list") {
                try {
                  toolResult = JSON.parse(full || preview)
                  // Extract actual content from MCP content blocks if present
                  toolResult = extractMcpContent(toolResult)
                } catch {
                  toolResult = preview
                }
              }
              resumeEvents.push({ type: "tool_result", name: resolvedToolName, result: toolResult })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, events: [...resumeEvents] } : m
                )
              )
            },
            onContent: (chunk) => {
              finalContent += chunk
              resumeEvents.push({ type: "content", content: chunk })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: finalContent, events: [...resumeEvents] }
                    : m
                )
              )
            },
            onResult: (resultContent) => {
              finalContent = resultContent
              // Push result event so assistant-message can extract final content
              resumeEvents.push({ type: "result", content: resultContent })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: resultContent, events: [...resumeEvents] }
                    : m
                )
              )
            },
            onError: (error) => {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: `Error: ${error}` } : m
                )
              )
              setIsLoading(false)
            },
            onDone: () => {
              setIsLoading(false)
            },
            onToolApprovalRequired: (newApprovalId, toolName, toolInput, parameterSchema) => {
              resumeEvents.push({
                type: "tool_approval_required",
                approval_id: newApprovalId,
                tool_name: toolName,
                tool_input: toolInput,
                parameter_schema: parameterSchema as RJSFSchema | undefined
              })
              setPendingApprovals(prev => {
                const newMap = new Map(prev)
                newMap.set(newApprovalId, null)
                return newMap
              })
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, events: [...resumeEvents] } : m
                )
              )
            },
          },
          accessToken,
          modifiedParams,
          abortControllerRef.current?.signal,
          lastToolName  // Pass tool name for progress streaming
        )

        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error calling approveTool:', error)
      setPendingApprovals(prev => {
        const newMap = new Map(prev)
        newMap.set(approvalId, null)
        return newMap
      })
      setIsLoading(false)
    }
  }, [getAccessToken, currentStreamIdRef, currentAssistantIdRef, abortControllerRef, setMessages, setIsLoading])

  return {
    pendingApprovals,
    setPendingApprovals,
    handleToolApproval,
  }
}
