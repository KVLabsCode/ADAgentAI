"use client"

import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  EmptyState,
} from "@/components/ui/theme"
import { formatDate, formatCurrency, type Invoice } from "@/lib/billing"

interface InvoiceListProps {
  invoices: Invoice[]
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  return (
    <SectionCard>
      <SectionCardHeader
        icon={FileText}
        title="Invoice History"
        description="Your past invoices and payments."
      />
      <SectionCardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Invoices will appear here after your first payment"
            className="py-8"
          />
        ) : (
          <div className="space-y-1">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-2 px-3 -mx-3 rounded hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{invoice.product}</span>
                      <Badge
                        variant="outline"
                        className="text-[8px] h-3.5 px-1 bg-success/10 text-success border-success/30"
                      >
                        paid
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(invoice.createdAt)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
