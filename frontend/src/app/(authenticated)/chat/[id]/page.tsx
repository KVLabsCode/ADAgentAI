"use client"

import { ChatContainer } from "@/components/chat/chat-container"
import type { Provider, Message } from "@/lib/types"

// Mock providers - replace with real data from API
const mockProviders: Provider[] = [
  {
    id: "1",
    type: "admob",
    status: "connected",
    displayName: "My AdMob Account",
    identifiers: {
      publisherId: "pub-1234567890123456",
    },
  },
]

// Mock messages for existing chat - replace with real data from API
const mockMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "What was my total ad revenue in December?",
    createdAt: "2025-12-15T10:00:00Z",
  },
  {
    id: "2",
    role: "assistant",
    content: "Based on your AdMob data, your total ad revenue for December 2025 was **$12,450.32**. This represents a 15% increase compared to November.\n\nHere's the breakdown by ad format:\n- Banner ads: $4,230.15\n- Interstitial ads: $5,890.22\n- Rewarded ads: $2,329.95",
    agentName: "AdMob Agent",
    createdAt: "2025-12-15T10:00:05Z",
    thinking: "I need to query the AdMob API for the total revenue in December 2025. Let me fetch the earnings report for that period and break it down by ad format for better insights.",
    toolCalls: [
      {
        name: "get_earnings_report",
        params: { startDate: "2025-12-01", endDate: "2025-12-31" },
      },
    ],
  },
]

export default function ChatSessionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // In a real app, fetch the chat session data based on params.id
  return (
    <div className="h-full">
      <ChatContainer
        providers={mockProviders}
        initialMessages={mockMessages}
      />
    </div>
  )
}
