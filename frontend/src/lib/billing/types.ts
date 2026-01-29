export interface PricingTier {
  name: string
  price: string
  priceId?: string
  description: string
  features: string[]
  popular?: boolean
}

export interface Subscription {
  hasSubscription: boolean
  status: string
  plan: {
    id: string
    name: string
    amount: number
    currency: string
    interval: string
  } | null
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  customerId?: string
}

export interface Usage {
  queries: number       // Number of user messages
  toolCalls: number     // Number of MCP tools executed
  tokens: number        // Total tokens used
  cost: number          // Estimated cost in USD
  limits: {
    queries: number
    tokens: number
  }
  isPro: boolean
  isAdmin: boolean
  periodStart: string
  periodEnd: string
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  product: string
}
