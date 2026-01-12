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
} from "@/components/ui/table"

// Consistent table container wrapper
interface DataTableContainerProps {
  children: React.ReactNode
  className?: string
}

function DataTableContainer({ children, className }: DataTableContainerProps) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border/50", className)}>
      {children}
    </div>
  )
}

// Consistent table header row (non-hoverable)
interface DataTableHeaderRowProps extends React.ComponentProps<typeof TableRow> {}

function DataTableHeaderRow({ className, ...props }: DataTableHeaderRowProps) {
  return (
    <TableRow
      className={cn("hover:bg-transparent border-border/50 bg-card", className)}
      {...props}
    />
  )
}

// Consistent table head cell
interface DataTableHeadProps extends React.ComponentProps<typeof TableHead> {}

function DataTableHead({ className, ...props }: DataTableHeadProps) {
  return (
    <TableHead
      className={cn("h-10 text-sm font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

// Consistent table body row
interface DataTableRowProps extends React.ComponentProps<typeof TableRow> {}

function DataTableRow({ className, ...props }: DataTableRowProps) {
  return (
    <TableRow
      className={cn("border-border/50", className)}
      {...props}
    />
  )
}

// Consistent table cell with padding
interface DataTableCellProps extends React.ComponentProps<typeof TableCell> {}

function DataTableCell({ className, ...props }: DataTableCellProps) {
  return (
    <TableCell
      className={cn("py-3", className)}
      {...props}
    />
  )
}

// Re-export base components for convenience
export {
  DataTableContainer,
  DataTableHeaderRow,
  DataTableHead,
  DataTableRow,
  DataTableCell,
  // Re-export base table components
  Table,
  TableBody,
  TableHeader,
}
