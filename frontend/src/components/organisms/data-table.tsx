"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/molecules/table"

// =============================================================================
// DATA TABLE COMPONENTS - Use CSS variables from globals.css for DRY styling
// =============================================================================

// Data table section with title outside card (Linear-style)
interface DataTableSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function DataTableSection({ title, description, children, className }: DataTableSectionProps) {
  return (
    <div className={cn(className)}>
      <div className="mb-[var(--section-header-mb)]">
        <h2 className="text-[length:var(--text-section-title)] font-medium text-muted-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-[length:var(--text-description)] text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// Consistent table container wrapper
interface DataTableContainerProps {
  children: React.ReactNode
  className?: string
}

function DataTableContainer({ children, className }: DataTableContainerProps) {
  return (
    <div className={cn(
      "overflow-hidden rounded-[var(--card-radius)] border-[color:var(--card-border)] border bg-[var(--card-bg)]",
      className
    )}>
      {children}
    </div>
  )
}

// Consistent table header row (non-hoverable)
type DataTableHeaderRowProps = React.ComponentProps<typeof TableRow>

function DataTableHeaderRow({ className, ...props }: DataTableHeaderRowProps) {
  return (
    <TableRow
      className={cn("hover:bg-transparent border-[color:var(--item-divider)] bg-[var(--card-bg)]", className)}
      {...props}
    />
  )
}

// Consistent table head cell
type DataTableHeadProps = React.ComponentProps<typeof TableHead>

function DataTableHead({ className, ...props }: DataTableHeadProps) {
  return (
    <TableHead
      className={cn("h-10 text-[length:var(--text-label)] font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

// Consistent table body row
type DataTableRowProps = React.ComponentProps<typeof TableRow>

function DataTableRow({ className, ...props }: DataTableRowProps) {
  return (
    <TableRow
      className={cn("border-[color:var(--item-divider)]", className)}
      {...props}
    />
  )
}

// Consistent table cell with padding
type DataTableCellProps = React.ComponentProps<typeof TableCell>

function DataTableCell({ className, ...props }: DataTableCellProps) {
  return (
    <TableCell
      className={cn("py-[var(--item-padding-y)]", className)}
      {...props}
    />
  )
}

// Re-export base components for convenience
export {
  // Section wrapper (Linear-style with title outside)
  DataTableSection,
  // Table components
  DataTableContainer,
  DataTableHeaderRow,
  DataTableHead,
  DataTableRow,
  DataTableCell,
  // Re-export base table components
  Table,
  TableBody,
  TableHeader,
  // Types
  type DataTableSectionProps,
  type DataTableContainerProps,
}
