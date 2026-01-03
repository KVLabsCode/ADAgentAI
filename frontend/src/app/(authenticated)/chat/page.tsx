"use client"

import { ChatContainer } from "@/components/chat/chat-container"
import type { Provider } from "@/lib/types"

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
  {
    id: "2",
    type: "gam",
    status: "connected",
    displayName: "Production Network",
    identifiers: {
      networkCode: "12345678",
      accountName: "My Company GAM",
    },
  },
]

export default function ChatPage() {
  return (
    <div className="h-full">
      <ChatContainer providers={mockProviders} />
    </div>
  )
}
