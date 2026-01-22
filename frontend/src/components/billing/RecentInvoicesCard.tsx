"use client"

import { FileText } from "lucide-react"
import { Badge } from "@/atoms/badge"
import { formatDate, formatCurrency, type Invoice } from "@/lib/billing"

interface RecentInvoicesCardProps {
  invoices: Invoice[]
}

// Linear-style recent invoices card
export function RecentInvoicesCard({ invoices }: RecentInvoicesCardProps) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)] px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
        <p className="text-[length:var(--text-description)] text-muted-foreground">
          No invoices yet
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[var(--card-bg)] divide-y divide-[color:var(--item-divider)]">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="flex items-center justify-between px-[var(--item-padding-x)] py-[var(--item-padding-y)] hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
                  {invoice.product}
                </span>
                <Badge
                  variant="outline"
                  className="text-[8px] h-3.5 px-1 bg-success/10 text-success border-success/30"
                >
                  paid
                </Badge>
              </div>
              <p className="text-[length:var(--text-description)] text-muted-foreground">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>
          <span className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
            {formatCurrency(invoice.amount, invoice.currency)}
          </span>
        </div>
      ))}
    </div>
  )
}
