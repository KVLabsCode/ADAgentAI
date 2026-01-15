"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// =============================================================================
// PAGE CONTAINER - Consistent page wrapper with standard max-width and padding
// =============================================================================
interface PageContainerProps {
  children: React.ReactNode
  /** Container max-width - use 'default' for most pages */
  size?: "sm" | "default" | "lg" | "xl" | "full"
  className?: string
}

const PAGE_SIZES = {
  sm: "max-w-3xl",      // Small forms, chat history
  default: "max-w-5xl", // Standard pages
  lg: "max-w-6xl",      // Dashboard, wider content
  xl: "max-w-7xl",      // Tables with many columns
  full: "max-w-full",   // Full width
}

function PageContainer({ children, size = "default", className }: PageContainerProps) {
  return (
    <div className={cn(
      "flex flex-col gap-6 p-6 w-full mx-auto",
      PAGE_SIZES[size],
      className
    )}>
      {children}
    </div>
  )
}

// =============================================================================
// PAGE HEADER - Consistent page title and description
// =============================================================================
interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// =============================================================================
// SECTION CARD - Card with header (icon, title, description) and content
// =============================================================================
interface SectionCardProps {
  children: React.ReactNode
  className?: string
}

function SectionCard({ children, className }: SectionCardProps) {
  return (
    <div className={cn("rounded border border-border/30", className)}>
      {children}
    </div>
  )
}

interface SectionCardHeaderProps {
  icon?: React.ElementType
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

function SectionCardHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
}: SectionCardHeaderProps) {
  return (
    <div className={cn(
      "px-4 py-3 border-b border-border/30 bg-card rounded-t flex items-center justify-between",
      className
    )}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          {description && (
            <p className="text-[10px] text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

interface SectionCardContentProps {
  children: React.ReactNode
  className?: string
  /** Add padding to content - default true */
  padded?: boolean
}

function SectionCardContent({ children, className, padded = true }: SectionCardContentProps) {
  return (
    <div className={cn(padded && "px-4 py-4", className)}>
      {children}
    </div>
  )
}

// =============================================================================
// STAT CARD - Consistent metric display
// =============================================================================
interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ElementType
  /** Only use functional colors: 'default' | 'success' | 'warning' | 'error' */
  valueColor?: "default" | "success" | "warning" | "error"
  /** Secondary value shown below main value (e.g., cost, count) */
  subValue?: string
  /** Trend indicator */
  trend?: "up" | "down" | "neutral"
  /** Trend value text (e.g., "+12%") */
  trendValue?: string
  className?: string
}

const VALUE_COLORS = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
}

function StatCard({
  title,
  value,
  icon: Icon,
  valueColor = "default",
  subValue,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <div className={cn(
      "p-4 rounded border border-border/50 bg-card",
      className
    )}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-[10px] font-medium uppercase tracking-wider">{title}</span>
      </div>
      <p className={cn(
        "font-mono text-xl font-semibold tabular-nums",
        VALUE_COLORS[valueColor]
      )}>
        {value}
      </p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{subValue}</p>
      )}
      {trend && trendValue && (
        <p className={cn(
          "text-[10px] mt-1.5 font-mono",
          trend === "up" && "text-success",
          trend === "down" && "text-destructive",
          trend === "neutral" && "text-muted-foreground"
        )}>
          {trendValue}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// FILTER BAR - Search + filters row
// =============================================================================
interface FilterBarProps {
  children: React.ReactNode
  className?: string
}

function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {children}
    </div>
  )
}

// =============================================================================
// CONFIG FIELD - Form field with label, description, and optional metadata
// =============================================================================
interface ConfigFieldProps {
  label: string
  description?: string
  children: React.ReactNode
  /** Highlight the field (e.g., for warnings) */
  highlight?: boolean
  className?: string
}

function ConfigField({
  label,
  description,
  children,
  highlight = false,
  className,
}: ConfigFieldProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <p className={cn(
          "text-xs font-medium",
          highlight ? "text-warning" : "text-foreground"
        )}>
          {label}
        </p>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// =============================================================================
// EMPTY STATE - Consistent empty state display
// =============================================================================
interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 text-center",
      className
    )}>
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

// =============================================================================
// STATUS BADGE - Functional status indicators
// =============================================================================
interface StatusBadgeProps {
  status: "success" | "error" | "warning" | "pending" | "info"
  label: string
  icon?: React.ElementType
  className?: string
}

const STATUS_STYLES = {
  success: "bg-success/10 text-success border-success/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  pending: "bg-info/10 text-info border-info/30",
  info: "bg-muted text-muted-foreground border-border/50",
}

function StatusBadge({ status, label, icon: Icon, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium",
      STATUS_STYLES[status],
      className
    )}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}

// =============================================================================
// LOADING SPINNER - Consistent loading state
// =============================================================================
interface LoadingSpinnerProps {
  label?: string
  className?: string
}

function LoadingSpinner({ label = "Loading...", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex h-96 items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// =============================================================================
// ERROR CARD - Consistent error display
// =============================================================================
interface ErrorCardProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

function ErrorCard({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorCardProps) {
  return (
    <div className={cn(
      "rounded border border-destructive/30 bg-destructive/5 px-4 py-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-destructive hover:text-destructive/80 font-medium"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// STATUS MESSAGE - Success/error notifications
// =============================================================================
interface StatusMessageProps {
  type: "success" | "error"
  message: string
  className?: string
}

function StatusMessage({ type, message, className }: StatusMessageProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded text-xs",
      type === "success"
        ? "bg-success/10 text-success"
        : "bg-destructive/10 text-destructive",
      className
    )}>
      {type === "success" ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </div>
  )
}

// =============================================================================
// TABLE PAGINATION - Consistent pagination for tables
// =============================================================================
interface TablePaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: TablePaginationProps) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className={cn(
      "flex items-center justify-between border-t border-border/50 px-4 py-3",
      className
    )}>
      <p className="text-xs text-muted-foreground">
        {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-7 px-2 text-xs rounded border border-border/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-7 px-2 text-xs rounded border border-border/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export {
  // Layout
  PageContainer,
  PageHeader,
  // Sections
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  // Data Display
  StatCard,
  StatusBadge,
  StatusMessage,
  // Forms
  FilterBar,
  ConfigField,
  // States
  EmptyState,
  LoadingSpinner,
  ErrorCard,
  // Navigation
  TablePagination,
  // Types
  type PageContainerProps,
  type PageHeaderProps,
  type SectionCardProps,
  type SectionCardHeaderProps,
  type SectionCardContentProps,
  type StatCardProps,
  type FilterBarProps,
  type ConfigFieldProps,
  type EmptyStateProps,
  type StatusBadgeProps,
  type StatusMessageProps,
  type LoadingSpinnerProps,
  type ErrorCardProps,
  type TablePaginationProps,
}
