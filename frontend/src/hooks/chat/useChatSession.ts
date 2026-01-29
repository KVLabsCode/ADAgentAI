"use client"

import * as React from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface UseChatSessionOptions {
  getAccessToken: () => Promise<string | null>
  selectedOrganizationId?: string | null
}

export function useChatSession({ getAccessToken, selectedOrganizationId }: UseChatSessionOptions) {
  // Create a new chat session
  const createSession = React.useCallback(async (title?: string): Promise<string | null> => {
    try {
      const accessToken = await getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['x-stack-access-token'] = accessToken
      }
      if (selectedOrganizationId) {
        headers['x-organization-id'] = selectedOrganizationId
      }
      const response = await fetch(`${API_URL}/api/chat/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title || 'New Chat', organization_id: selectedOrganizationId }),
      })
      if (response.ok) {
        const data = await response.json()
        return data.session.id
      }
    } catch (error) {
      console.error('Failed to create chat session:', error)
    }
    return null
  }, [getAccessToken, selectedOrganizationId])

  // Save a message to the database
  const saveMessage = React.useCallback(async (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const accessToken = await getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['x-stack-access-token'] = accessToken
      }
      if (selectedOrganizationId) {
        headers['x-organization-id'] = selectedOrganizationId
      }
      await fetch(`${API_URL}/api/chat/session/${sessionId}/save-message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, role, metadata }),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }, [getAccessToken, selectedOrganizationId])

  return { createSession, saveMessage }
}
