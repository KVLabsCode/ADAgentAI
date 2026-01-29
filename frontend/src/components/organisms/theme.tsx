"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StatCard, type StatCardProps } from "@/molecules/stat-card"

// =============================================================================
// DESIGN TOKENS - All styling values come from CSS variables in globals.css
// This ensures DRY principle - change once, update everywhere
// =============================================================================

// Tailwind classes that map to CSS variables (defined in globals.css)
// All values VERIFIED from Linear browser extraction 2026-01-21 - ground truth values:
// - Page title: 24px, weight 500, line-height 32px
// - Section heading (h3): 15px, weight 450, line-height 23px
// - Label: 13px, weight 500
// - Description: 12px, weight 450, color muted
// - Item: padding 12px 16px, min-height 60px, gap 12px
// - Card: background lch(8.3), border 0.8px solid lch(19.66), border-radius 7px
// Design tokens mapped to CSS variables
// Responsive values (--item-padding-x etc.) change at 640px breakpoint via media query
const TOKENS = {
  // Cards - Linear-style section card wrapper (wraps the ul)
  // VERIFIED: background lch(8.3), border 0.8px solid lch(19.66), border-radius 7px
  sectionCard: "rounded-[var(--card-radius)] bg-[var(--card-bg)] border-[0.8px] border-[color:var(--card-border)]",
  card: "rounded-[var(--card-radius)] bg-[var(--card-bg)]",
  cardHeaderBorder: "border-b border-[color:var(--card-header-border)]",
  // Inset dividers - Linear uses ::after pseudo with left/right: 16px for the "cut" effect
  itemDivider: "divide-inset",
  // Page layout - now handled by PageContainer and SettingsSection
  pagePadding: "px-[var(--page-padding)]",
  pageTopGap: "pt-[var(--page-top-gap)]",
  sectionGap: "gap-[var(--section-gap)]",
  titleToSection: "mb-[var(--title-to-section)]",
  sectionHeaderMb: "mb-[var(--section-header-mb)]",
  // Item/Row - VERIFIED: padding responsive (16px desktop → 10.67px mobile)
  // Uses CSS variable that changes at 640px breakpoint
  itemPadding: "px-[var(--item-padding-x)] py-[var(--item-padding-y)]",
  itemMinHeight: "min-h-[var(--item-min-height)]",
  itemGap: "gap-[var(--item-gap)]",
  itemBorderRadius: "rounded-[var(--item-border-radius)]",
} as const

// =============================================================================
// PAGE CONTAINER - Consistent page wrapper with standard max-width and padding
// =============================================================================
interface PageContainerProps {
  children: React.ReactNode
  /** Container max-width - use 'default' for most pages */
  size?: "sm" | "default" | "lg" | "xl" | "full"
  className?: string
}

// Max widths map to Tailwind utilities defined in globals.css @theme block
// These use CSS variables from :root for Figma sync compatibility
const PAGE_SIZES = {
  sm: "max-w-page-sm",
  default: "max-w-page-default",
  lg: "max-w-page-lg",
  xl: "max-w-page-xl",
  full: "max-w-full",
} as const

/**
 * PageContainer - Linear-style page layout with centered content
 *
 * Structure (matches Linear):
 * - Outer wrapper: full width, horizontal padding for safe edges
 * - Inner wrapper: flex column, align-items center
 * - Content: max-width constrained
 *
 * Responsive behavior (from Linear extraction 2026-01-28):
 * - Desktop: padding 0 40px, bottom margin 64px
 * - Mobile (≤640px): padding 0 22px, bottom margin 32px
 */
function PageContainer({ children, size = "default", className }: PageContainerProps) {
  return (
    // Outer wrapper - padding creates safe edges, won't cut off content
    <div
      className={cn(
        "w-full",
        "px-[var(--page-padding)]",
        "pt-16", // Top spacing (was --page-top-gap)
        "pb-[var(--page-bottom-gap)]",
        className
      )}
    >
      {/* Centering wrapper - centers the max-width content */}
      <div className="flex flex-col items-center w-full">
        {/* Content container - max-width constrained */}
        <div
          className={cn(
            "flex flex-col w-full",
            PAGE_SIZES[size]
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PAGE HEADER - Consistent page title and description (Linear-style)
// =============================================================================
interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

/**
 * PageHeader - Linear-style page title and description
 *
 * Spacing (from Linear extraction 2026-01-28):
 * - margin-bottom: 32px (title to first section)
 */
function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between",
      "mb-[var(--title-to-section)]", // 32px gap to first section
      className
    )}>
      <div className="space-y-1">
        {/* VERIFIED: Linear page title = 24px, weight 500, line-height 32px */}
        <h1 className="text-[length:var(--text-page-title)] leading-[var(--line-height-title)] font-[var(--font-weight-medium)] tracking-tight">{title}</h1>
        {description && (
          <p className="text-[length:var(--text-description)] text-[color:var(--text-color-description)] font-[var(--font-weight-normal)]">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// =============================================================================
// SETTINGS SECTION - Linear-style section with header and card
// Combines section header + card for proper grouping
// =============================================================================
interface SettingsSectionProps {
  title: string
  children: React.ReactNode
  className?: string
  /** When true, renders children without card wrapper (for custom card layouts) */
  bare?: boolean
}

/**
 * SettingsSection - Linear-style section with header and card
 *
 * Responsive behavior (from Linear extraction 2026-01-28):
 * - Desktop: margin-bottom 64px between sections
 * - Mobile (≤640px): margin-bottom 32px between sections
 */
function SettingsSection({ title, children, className, bare = false }: SettingsSectionProps) {
  return (
    // margin-bottom creates section gaps (Linear uses margin, not flex gap)
    <div className={cn("mb-[var(--section-gap)]", className)}>
      {/* Linear h3 = 15px, weight 450 - using 500 for Geist to match Inter's visual weight */}
      <h3 className={cn(
        "text-[length:var(--text-section-title)] leading-[var(--line-height-section)] font-[var(--font-weight-section)] text-foreground",
        TOKENS.sectionHeaderMb
      )}>
        {title}
      </h3>
      {bare ? (
        children
      ) : (
        /* VERIFIED: Linear wraps ul in section with bg, border, border-radius */
        /* overflow-hidden clips highlight borders (border-l-2) to card's rounded corners */
        <div className={cn(TOKENS.sectionCard, TOKENS.itemDivider, "overflow-hidden")}>
          {children}
        </div>
      )}
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
    <div className={cn(TOKENS.card, className)}>
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
      TOKENS.itemPadding,
      TOKENS.cardHeaderBorder,
      "flex items-center justify-between",
      className
    )}>
      <div className="flex items-center gap-[var(--item-gap)]">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <div>
          {/* VERIFIED: Linear label = 13px, weight 500 */}
          <h2 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">{title}</h2>
          {/* VERIFIED: Linear description = 12px, weight 450, muted color */}
          {description && (
            <p className="text-[length:var(--text-description)] text-[color:var(--text-color-description)] font-[var(--font-weight-normal)] mt-0.5">{description}</p>
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
    <div className={cn(padded && TOKENS.itemPadding, className)}>
      {children}
    </div>
  )
}

// =============================================================================
// STAT CARD - Re-exported from stat-card.tsx
// =============================================================================
// StatCard is imported and re-exported from ./stat-card.tsx for backwards compatibility

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
// CONFIG FIELD GROUP - Wraps ConfigFields with Linear-style dividers
// =============================================================================
interface ConfigFieldGroupProps {
  children: React.ReactNode
  className?: string
}

function ConfigFieldGroup({ children, className }: ConfigFieldGroupProps) {
  return (
    <div className={cn(TOKENS.itemDivider, className)}>
      {children}
    </div>
  )
}

// =============================================================================
// SECTION HEADER - Linear-style section title outside cards
// Used when you need standalone section header (prefer SettingsSection instead)
// =============================================================================
interface SectionHeaderProps {
  children: React.ReactNode
  className?: string
}

function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <h3 className={cn(
      "text-[length:var(--text-section-title)] leading-[var(--line-height-section)] font-[var(--font-weight-section)] text-foreground",
      TOKENS.sectionHeaderMb,
      className
    )}>
      {children}
    </h3>
  )
}

// =============================================================================
// CONFIG FIELD - Linear-style form field with label, description, and control
// =============================================================================
interface ConfigFieldProps {
  label: string
  description?: string
  children?: React.ReactNode
  /** Icon to show before label */
  icon?: React.ElementType
  /** Highlight the field (e.g., for warnings) */
  highlight?: "warning" | "error" | "info"
  /** Make this row clickable */
  onClick?: () => void
  /** Show chevron for navigation */
  hasChevron?: boolean
  /** Custom action text (instead of chevron) */
  actionText?: string
  className?: string
}

const HIGHLIGHT_STYLES = {
  warning: "bg-warning/5 border-l-2 border-l-warning",
  error: "bg-destructive/5 border-l-2 border-l-destructive",
  info: "bg-info/5 border-l-2 border-l-info",
}

function ConfigField({
  label,
  description,
  children,
  icon: Icon,
  highlight,
  onClick,
  hasChevron,
  actionText,
  className,
}: ConfigFieldProps) {
  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full text-left",
        TOKENS.itemPadding,
        TOKENS.itemMinHeight,
        TOKENS.itemGap,
        onClick && "hover:bg-muted/50 cursor-pointer transition-colors",
        highlight && HIGHLIGHT_STYLES[highlight],
        className
      )}
    >
      <div className="flex items-center gap-[var(--item-gap)] min-w-0 flex-1">
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          {/* VERIFIED: Linear label = 13px, weight 500, line-height 16px */}
          <p className={cn(
            "text-[length:var(--text-label)] leading-[var(--line-height-label)] font-[var(--font-weight-medium)]",
            highlight === "warning" && "text-warning",
            highlight === "error" && "text-destructive",
          )}>
            {label}
          </p>
          {/* VERIFIED: Linear description = 12px, weight 450, line-height 16px */}
          {description && (
            <p className="text-[length:var(--text-description)] leading-[var(--line-height-description)] text-[color:var(--text-color-description)] font-[var(--font-weight-normal)] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-[var(--item-gap)] shrink-0 ml-6">
        {children}
        {actionText && (
          <span className="text-[length:var(--text-label)] text-muted-foreground">{actionText}</span>
        )}
        {hasChevron && (
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </Wrapper>
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
  SectionHeader,
  // Sections
  SettingsSection,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  // Data Display
  StatCard,
  StatusBadge,
  StatusMessage,
  // Forms
  FilterBar,
  ConfigFieldGroup,
  ConfigField,
  // States
  EmptyState,
  LoadingSpinner,
  ErrorCard,
  // Navigation
  TablePagination,
  // Design Tokens (for custom components that need consistent styling)
  // Note: All tokens reference CSS variables from globals.css
  TOKENS,
  // Types
  type PageContainerProps,
  type PageHeaderProps,
  type SectionHeaderProps,
  type SettingsSectionProps,
  type SectionCardProps,
  type SectionCardHeaderProps,
  type SectionCardContentProps,
  type StatCardProps,
  type FilterBarProps,
  type ConfigFieldGroupProps,
  type ConfigFieldProps,
  type EmptyStateProps,
  type StatusBadgeProps,
  type StatusMessageProps,
  type LoadingSpinnerProps,
  type ErrorCardProps,
  type TablePaginationProps,
}
