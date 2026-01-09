"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Mail,
  Clock,
  CheckCircle2,
  Send,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
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

interface WaitlistStats {
  total: number
  pending: number
  invited: number
  joined: number
  rejected: number
}

function StatusBadge({ status }: { status: string }) {
  const getStatusInfo = () => {
    switch (status) {
      case "pending":
        return {
          label: "Awaiting Invite",
          description: "User signed up, waiting for you to send invite",
          className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20",
          icon: Clock,
        }
      case "invited":
        return {
          label: "Invite Sent",
          description: "Invitation email sent, waiting for user to sign up",
          className: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20",
          icon: Mail,
        }
      case "joined":
        return {
          label: "Joined",
          description: "User has created an account",
          className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20",
          icon: CheckCircle2,
        }
      case "rejected":
        return {
          label: "Rejected",
          description: "User was rejected from the waitlist",
          className: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20",
          icon: XCircle,
        }
      default:
        return {
          label: status,
          description: "",
          className: "",
          icon: Clock,
        }
    }
  }

  const info = getStatusInfo()
  const Icon = info.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={cn("text-[10px] h-5 px-1.5 cursor-help", info.className)}
        >
          <Icon className="h-2.5 w-2.5 mr-1" />
          {info.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[200px]">
        {info.description}
      </TooltipContent>
    </Tooltip>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<WaitlistStats>({ total: 0, pending: 0, invited: 0, joined: 0, rejected: 0 })
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

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, pendingRes, invitedRes, joinedRes, rejectedRes] = await Promise.all([
        fetch(`${API_URL}/api/waitlist/admin/list?limit=1`),
        fetch(`${API_URL}/api/waitlist/admin/list?limit=1&status=pending`),
        fetch(`${API_URL}/api/waitlist/admin/list?limit=1&status=invited`),
        fetch(`${API_URL}/api/waitlist/admin/list?limit=1&status=joined`),
        fetch(`${API_URL}/api/waitlist/admin/list?limit=1&status=rejected`),
      ])

      const [all, pending, invited, joined, rejected] = await Promise.all([
        allRes.json(),
        pendingRes.json(),
        invitedRes.json(),
        joinedRes.json(),
        rejectedRes.json(),
      ])

      setStats({
        total: all.total || 0,
        pending: pending.total || 0,
        invited: invited.total || 0,
        joined: joined.total || 0,
        rejected: rejected.total || 0,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchStats()
  }, [fetchEntries, fetchStats])

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
        fetchStats()
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
        fetchStats()
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

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Waitlist</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage waitlist entries and send invites
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => { fetchEntries(); fetchStats() }}
        >
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-foreground", desc: "All signups" },
          { label: "Awaiting", value: stats.pending, icon: Clock, color: "text-amber-500", desc: "Need to send invite" },
          { label: "Invited", value: stats.invited, icon: Mail, color: "text-blue-500", desc: "Invite sent" },
          { label: "Joined", value: stats.joined, icon: CheckCircle2, color: "text-emerald-500", desc: "Created account" },
          { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-500", desc: "Rejected from waitlist" },
        ].map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-md border border-border/50 bg-card/50 cursor-help">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <stat.icon className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{stat.label}</span>
                </div>
                <p className={cn("text-xl font-semibold tabular-nums", stat.color)}>{stat.value}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {stat.desc}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="pending" className="text-xs">Awaiting Invite</SelectItem>
            <SelectItem value="invited" className="text-xs">Invite Sent</SelectItem>
            <SelectItem value="joined" className="text-xs">Joined</SelectItem>
            <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium mb-1">No entries found</h3>
          <p className="text-xs text-muted-foreground">
            {searchQuery ? "Try adjusting your search." : "The waitlist is empty."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 text-xs">Email</TableHead>
                  <TableHead className="h-10 text-xs">Role</TableHead>
                  <TableHead className="h-10 text-xs">Status</TableHead>
                  <TableHead className="h-10 text-xs">Date</TableHead>
                  <TableHead className="h-10 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-xs">{entry.email}</span>
                        {entry.name && (
                          <span className="text-[10px] text-muted-foreground">{entry.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {entry.role ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border/50 capitalize">
                          {entry.role}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-7 w-7 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {entry.useCase && (
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <FileText className="mr-2 h-3.5 w-3.5" />
                              View Use Case
                            </DropdownMenuItem>
                          )}
                          {entry.status === "pending" && (
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={() => handleInvite(entry.email)}
                              disabled={inviting === entry.email}
                            >
                              {inviting === entry.email ? (
                                <>
                                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-3.5 w-3.5" />
                                  Send Invite
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {entry.status !== "rejected" && entry.status !== "joined" && (
                            <>
                              {(entry.useCase || entry.status === "pending") && (
                                <DropdownMenuSeparator />
                              )}
                              <DropdownMenuItem
                                className="text-xs cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => handleRejectClick(entry)}
                                disabled={rejecting === entry.email}
                              >
                                {rejecting === entry.email ? (
                                  <>
                                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="mr-2 h-3.5 w-3.5" />
                                    Reject
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Use Case Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Use Case</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedEntry?.email}
              {selectedEntry?.role && (
                <span className="ml-1.5 capitalize">• {selectedEntry.role}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedEntry?.name && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                <p className="text-sm">{selectedEntry.name}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Use Case</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                {selectedEntry?.useCase || "No use case provided"}
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Status</p>
              {selectedEntry && <StatusBadge status={selectedEntry.status} />}
            </div>
          </div>
          <DialogFooter className="gap-3">
            {selectedEntry?.status !== "rejected" && selectedEntry?.status !== "joined" && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  if (selectedEntry) {
                    setSelectedEntry(null)
                    handleRejectClick(selectedEntry)
                  }
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Reject
              </Button>
            )}
            {selectedEntry?.status === "pending" && (
              <Button
                size="sm"
                className="h-8 text-xs"
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
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send Invite
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
            <AlertDialogTitle className="text-base">Reject from waitlist?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will mark <span className="font-medium text-foreground">{entryToReject?.email}</span> as rejected. The entry will remain in the waitlist for record keeping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
