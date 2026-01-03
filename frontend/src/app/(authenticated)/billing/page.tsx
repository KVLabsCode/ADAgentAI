"use client"

import * as React from "react"
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  Download,
  Trash2,
  Plus,
  FileText,
  ExternalLink,
  MoreHorizontal,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PricingTier {
  name: string
  price: string
  description: string
  features: string[]
  popular?: boolean
  current?: boolean
}

interface PaymentMethod {
  id: string
  type: "visa" | "mastercard" | "amex"
  last4: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: "paid" | "pending" | "failed"
  description: string
  pdfUrl: string
}

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals getting started",
    features: [
      "1 connected provider",
      "50 AI queries per month",
      "Basic analytics",
      "Community support",
    ],
    current: true,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For growing publishers",
    features: [
      "Unlimited providers",
      "Unlimited AI queries",
      "Advanced analytics",
      "Priority support",
      "Export reports",
      "Custom agents",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "SLA guarantees",
      "Custom integrations",
      "Team management",
      "Audit logs",
    ],
  },
]

// Mock data - replace with real API calls
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: "pm_1",
    type: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2027,
    isDefault: true,
  },
]

const mockInvoices: Invoice[] = [
  {
    id: "inv_001",
    date: "2026-01-01",
    amount: 0,
    status: "paid",
    description: "Free Plan - January 2026",
    pdfUrl: "#",
  },
  {
    id: "inv_002",
    date: "2025-12-01",
    amount: 0,
    status: "paid",
    description: "Free Plan - December 2025",
    pdfUrl: "#",
  },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getCardIcon(type: PaymentMethod["type"]) {
  const iconClass = "h-6 w-4 text-muted-foreground"
  switch (type) {
    case "visa":
      return <span className={cn(iconClass, "font-bold text-[10px] text-blue-600")}>VISA</span>
    case "mastercard":
      return <span className={cn(iconClass, "font-bold text-[10px] text-orange-600")}>MC</span>
    case "amex":
      return <span className={cn(iconClass, "font-bold text-[10px] text-blue-800")}>AMEX</span>
  }
}

export default function BillingPage() {
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>(mockPaymentMethods)
  const [invoices] = React.useState<Invoice[]>(mockInvoices)
  const [currentPlan] = React.useState<"free" | "pro" | "enterprise">("free")

  const handleRemovePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
  }

  const handleSetDefaultPayment = (id: string) => {
    setPaymentMethods(prev =>
      prev.map(pm => ({ ...pm, isDefault: pm.id === id }))
    )
  }

  const handleDownloadInvoice = (invoice: Invoice) => {
    // TODO: Implement actual download
    console.log("Downloading invoice:", invoice.id)
  }

  const handleCancelSubscription = () => {
    // TODO: Implement subscription cancellation via Polar
    console.log("Cancelling subscription")
  }

  const handleManageSubscription = () => {
    // TODO: Redirect to Polar customer portal
    console.log("Opening Polar customer portal")
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-4xl mx-auto">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Billing</h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your subscription and payment methods.
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium">Current Plan</h2>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              {currentPlan === "free" ? "Free" : currentPlan === "pro" ? "Pro" : "Enterprise"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
            <span className="text-[10px] text-muted-foreground/60">Active</span>
          </div>
        </div>
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {currentPlan === "free" ? "$0" : currentPlan === "pro" ? "$29" : "Custom"}
                <span className="text-xs text-muted-foreground/60 font-normal">/month</span>
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                32 of 50 queries used this month
              </p>
              {/* Usage bar */}
              <div className="mt-2 h-1 w-32 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full w-[64%] bg-primary/70 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {currentPlan !== "free" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={handleManageSubscription}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                      >
                        Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base">Cancel subscription?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                          Your plan will remain active until the end of the current billing period.
                          You can resubscribe at any time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="h-8 text-xs">Keep Plan</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-xs font-medium mb-2">Available Plans</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "rounded border px-3 py-2.5",
                tier.popular
                  ? "border-primary/50 bg-primary/[0.02]"
                  : "border-border/30",
                tier.current && "bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {tier.name === "Enterprise" ? (
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                  ) : tier.popular ? (
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                  <span className="text-sm font-medium">{tier.name}</span>
                </div>
                {tier.popular && (
                  <Badge className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-0">
                    Popular
                  </Badge>
                )}
                {tier.current && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-border/40">
                    Current
                  </Badge>
                )}
              </div>
              <div className="mb-1.5">
                <span className="text-lg font-semibold">{tier.price}</span>
                {tier.price !== "Custom" && (
                  <span className="text-[10px] text-muted-foreground/60">/mo</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mb-2">{tier.description}</p>
              <ul className="space-y-1 mb-2.5">
                {tier.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                    <Check className="h-2.5 w-2.5 text-green-500/70 shrink-0" />
                    {feature}
                  </li>
                ))}
                {tier.features.length > 3 && (
                  <li className="text-[10px] text-muted-foreground/50">
                    +{tier.features.length - 3} more
                  </li>
                )}
              </ul>
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                variant={tier.current ? "outline" : tier.popular ? "default" : "outline"}
                disabled={tier.current}
              >
                {tier.current ? "Current" : tier.name === "Enterprise" ? "Contact" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium">Payment Methods</h2>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Manage your saved payment methods.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
                <Plus className="h-2.5 w-2.5 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Add Payment Method</DialogTitle>
                <DialogDescription className="text-xs">
                  You'll be redirected to our secure payment provider.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Button className="w-full" onClick={handleManageSubscription}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Continue to Polar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="px-3 py-2">
          {paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded bg-muted/50 p-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-[11px] text-muted-foreground/70">No payment methods saved</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Add a payment method to upgrade your plan
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-10 rounded border border-border/40 bg-background flex items-center justify-center">
                      {getCardIcon(method.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">•••• {method.last4}</span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {!method.isDefault && (
                        <DropdownMenuItem
                          onClick={() => handleSetDefaultPayment(method.id)}
                          className="text-xs"
                        >
                          <Check className="h-3 w-3 mr-2" />
                          Set as default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base">Remove payment method?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs">
                              This card ending in {method.last4} will be removed from your account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemovePaymentMethod(method.id)}
                              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoice History */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2 border-b border-border/30">
          <h2 className="text-xs font-medium">Invoice History</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Download past invoices for your records.
          </p>
        </div>
        <div className="px-3 py-2">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded bg-muted/50 p-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-[11px] text-muted-foreground/70">No invoices yet</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Invoices will appear here after your first payment
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded bg-muted/50 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{invoice.description}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[8px] h-3.5 px-1",
                            invoice.status === "paid" && "bg-green-500/10 text-green-600",
                            invoice.status === "pending" && "bg-amber-500/10 text-amber-600",
                            invoice.status === "failed" && "bg-red-500/10 text-red-600"
                          )}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDate(invoice.date)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">•</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          ${invoice.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Notice */}
      <div className="flex items-start gap-2 px-3 py-2 rounded bg-muted/30 border border-border/20">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] text-muted-foreground/70">
            Need help with billing? Contact{" "}
            <a href="mailto:support@adagent.app" className="text-foreground/70 hover:text-foreground underline-offset-2 hover:underline">
              support@adagent.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
