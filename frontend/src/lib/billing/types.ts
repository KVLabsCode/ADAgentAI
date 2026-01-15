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
  chatMessages: number
  providerQueries: number
  limit: {
    chatMessages: number
    providerQueries: number
  }
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  product: string
}
