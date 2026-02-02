"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Send,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  XCircle,
} from "lucide-react"
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import { PageContainer } from "@/organisms/theme"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/molecules/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/molecules/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/molecules/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/molecules/tooltip"
import { Skeleton } from "@/atoms/skeleton"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface WaitlistEntry {
  id: string
  email: string
  name: string | null
  status: "pending" | "invited" | "joined" | "rejected"
  referralCode: string
  referredBy: string | null
  role: string | null
  useCase: string | null
  createdAt: string
  invitedAt: string | null
}

function StatusBadge({ status }: { status: string }) {
  const getStatusInfo = () => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          description: "Waiting for invite",
          // Linear uses purple/violet for badges
          className: "bg-[lch(48_59.31_288.43/0.2)] text-foreground",
        }
      case "invited":
        return {
          label: "Invited",
          description: "Invite sent",
          className: "bg-[lch(48_59.31_288.43/0.2)] text-foreground",
        }
      case "joined":
        return {
          label: "Joined",
          description: "Account created",
          className: "bg-emerald-500/20 text-emerald-400",
        }
      case "rejected":
        return {
          label: "Rejected",
          description: "Rejected from waitlist",
          className: "bg-red-500/20 text-red-400",
        }
      default:
        return { label: status, description: "", className: "" }
    }
  }

  const info = getStatusInfo()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-xs font-normal cursor-help", info.className)} />
        }
      >
        {/* Linear badge: padding 2px 6px, border-radius 3px, font-size ~12px */}
        {info.label}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {info.description}
      </TooltipContent>
    </Tooltip>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email[0].toUpperCase()
}

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [entryToReject, setEntryToReject] = useState<WaitlistEntry | null>(null)
  const limit = 20

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : ""
      const res = await fetch(
        `${API_URL}/api/waitlist/admin/list?limit=${limit}&offset=${page * limit}${statusParam}`
      )
      const data = await res.json()
      setEntries(data.entries || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Failed to fetch waitlist:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleInvite = async (email: string) => {
    setInviting(email)
    try {
      const res = await fetch(`${API_URL}/api/waitlist/admin/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        fetchEntries()
      } else {
        alert(data.error || "Failed to invite user")
      }
    } catch (error) {
      console.error("Failed to invite:", error)
      alert("Failed to invite user")
    } finally {
      setInviting(null)
    }
  }

  const handleRejectClick = (entry: WaitlistEntry) => {
    setEntryToReject(entry)
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!entryToReject) return
    setRejecting(entryToReject.email)
    try {
      const res = await fetch(`${API_URL}/api/waitlist/admin/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: entryToReject.email }),
      })
      const data = await res.json()
      if (data.success) {
        fetchEntries()
      } else {
        alert(data.error || "Failed to reject user")
      }
    } catch (error) {
      console.error("Failed to reject:", error)
      alert("Failed to reject user")
    } finally {
      setRejecting(null)
      setRejectDialogOpen(false)
      setEntryToReject(null)
    }
  }

  const filteredEntries = entries.filter(entry =>
    entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group entries by status - preserve pending/invited as separate groups
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const group = entry.status
    if (!acc[group]) acc[group] = []
    acc[group].push(entry)
    return acc
  }, {} as Record<string, WaitlistEntry[]>)

  // Define group order and labels
  const groupOrder = ["pending", "invited", "joined", "rejected"]
  const groupLabels: Record<string, string> = {
    pending: "Pending",
    invited: "Invited",
    joined: "Joined",
    rejected: "Rejected",
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <PageContainer size="full">
      {/* Header - Linear style: title on first row, controls below */}
      <div className="flex flex-col gap-3 -mx-[var(--page-padding)] px-[var(--page-padding)]">
        <h1 className="text-[length:var(--text-page-title)] leading-[var(--line-height-title)] font-[var(--font-weight-medium)] pl-[var(--item-padding-x)]">
          Waitlist
        </h1>
        <div className="flex items-center gap-5 pl-[var(--item-padding-x)] pr-[var(--item-padding-x)] pb-2">
          {/* Search - Linear style: 300px, dark bg */}
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 !bg-[lch(4.8_0.7_272)] border-[0.8px] border-[lch(19_3.54_272)] rounded-[5px] text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          {/* Filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
            <SelectTrigger size="sm" className="w-24 text-[13px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="joined">Joined</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {/* Refresh - pushed right */}
          <Button variant="outline" size="sm" className="h-8 ml-auto" onClick={fetchEntries}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table - Linear style full width */}
      <div className="mt-4 overflow-visible">
        {loading ? (
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-[50px] w-full" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-normal mb-1">No entries found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Try adjusting your search." : "The waitlist is empty."}
            </p>
          </div>
        ) : (
          <>
            {/* Column headers - Linear style aligned with row data, 32px height */}
            <div className="flex items-center h-8 text-xs font-medium text-muted-foreground -mx-[var(--page-padding)] px-[var(--page-padding)]">
              <div className="w-[40%] min-w-0 pl-[var(--item-padding-x)]">Name</div>
              <div className="w-[25%] min-w-0">Email</div>
              <div className="w-[15%] min-w-0">Status</div>
              <div className="w-[12%] min-w-0">Joined</div>
              <div className="w-[8%] min-w-0 pr-[var(--item-padding-x)]"></div>
            </div>

            {/* Grouped sections - ordered by groupOrder */}
            {groupOrder
              .filter((group) => groupedEntries[group]?.length > 0)
              .map((group) => {
                const groupEntries = groupedEntries[group]
                return (
              <div key={group}>
                {/* Section header - full width with negative margins */}
                <div className="flex items-center gap-2 h-8 bg-[lch(10.633_3.033_272)] -mx-[var(--page-padding)] px-[var(--page-padding)]">
                  <span className="text-xs font-medium text-foreground pl-[var(--item-padding-x)]">
                    {groupLabels[group] || group}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {groupEntries.length}
                  </span>
                </div>

                {/* Rows - full width with border separator */}
                {groupEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "group flex items-center h-[50px] hover:bg-muted/30 has-[[data-state=open]]:bg-muted/30 transition-colors -mx-[var(--page-padding)] px-[var(--page-padding)]",
                      idx < groupEntries.length - 1 && "border-b border-[color:var(--item-divider)]"
                    )}
                  >
                    {/* Name + Avatar - 40% width to match header */}
                    <div className="w-[40%] min-w-0 flex items-center gap-3 pl-[var(--item-padding-x)]">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-medium shrink-0">
                        {getInitials(entry.name, entry.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[length:var(--text-label)] font-normal truncate">
                          {entry.name || entry.email.split('@')[0]}
                        </div>
                        {entry.role && (
                          <div className="text-xs text-muted-foreground truncate">
                            {entry.role}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email - 25% width */}
                    <div className="w-[25%] min-w-0 text-xs text-muted-foreground truncate">
                      {entry.email}
                    </div>

                    {/* Status - 15% width */}
                    <div className="w-[15%] min-w-0">
                      <StatusBadge status={entry.status} />
                    </div>

                    {/* Date - 12% width */}
                    <div className="w-[12%] min-w-0 text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </div>

                    {/* Actions - 8% width, only visible on hover */}
                    <div className="w-[8%] min-w-0 flex justify-end pr-[var(--item-padding-x)]">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-muted hover:bg-muted transition-all" />
                          }
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {entry.useCase && (
                            <DropdownMenuItem onClick={() => setSelectedEntry(entry)}>
                              <FileText className="mr-2 h-3.5 w-3.5" />
                              View details
                            </DropdownMenuItem>
                          )}
                          {entry.status === "pending" && (
                            <DropdownMenuItem
                              onClick={() => handleInvite(entry.email)}
                              disabled={inviting === entry.email}
                            >
                              {inviting === entry.email ? (
                                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-3.5 w-3.5" />
                              )}
                              Send invite
                            </DropdownMenuItem>
                          )}
                          {entry.status !== "rejected" && entry.status !== "joined" && (
                            <>
                              {(entry.useCase || entry.status === "pending") && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleRejectClick(entry)}
                                disabled={rejecting === entry.email}
                              >
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
                )
              })}

            {/* Pagination - Linear style */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[color:var(--item-divider)]">
                <p className="text-xs text-muted-foreground">
                  {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Use Case Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">Details</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedEntry?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedEntry?.name && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                <p className="text-sm">{selectedEntry.name}</p>
              </div>
            )}
            {selectedEntry?.role && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <p className="text-sm capitalize">{selectedEntry.role}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Use Case</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                {selectedEntry?.useCase || "No use case provided"}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {selectedEntry?.status !== "rejected" && selectedEntry?.status !== "joined" && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (selectedEntry) {
                    setSelectedEntry(null)
                    handleRejectClick(selectedEntry)
                  }
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            )}
            {selectedEntry?.status === "pending" && (
              <Button
                size="sm"
                onClick={() => {
                  if (selectedEntry) {
                    handleInvite(selectedEntry.email)
                    setSelectedEntry(null)
                  }
                }}
                disabled={inviting === selectedEntry?.email}
              >
                {inviting === selectedEntry?.email ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send invite
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject from waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <span className="font-medium text-foreground">{entryToReject?.email}</span> as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
