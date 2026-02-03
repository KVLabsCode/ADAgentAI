"use client"

import * as React from "react"
import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/molecules/dialog"
import { Button } from "@/atoms/button"
import { RadioGroup, RadioGroupItem } from "@/molecules/radio-group"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import type { OAuthAccount } from "@/lib/types"

interface AccountSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: OAuthAccount[]
  providerType: "admob" | "gam"
  onConfirm: (account: OAuthAccount) => void
  onCancel: () => void
}

export function AccountSelectionModal({
  open,
  onOpenChange,
  accounts,
  providerType,
  onConfirm,
  onCancel,
}: AccountSelectionModalProps) {
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("")

  // Reset selection when modal opens with new accounts
  React.useEffect(() => {
    if (open && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [open, accounts])

  const handleConfirm = () => {
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
    if (selectedAccount) {
      onConfirm(selectedAccount)
    }
  }

  const handleCancel = () => {
    setSelectedAccountId("")
    onCancel()
  }

  const providerLabel = providerType === "admob" ? "AdMob" : "Google Ad Manager"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <div
              className={cn(
                "h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-semibold",
                providerType === "admob" ? "bg-green-600/90" : "bg-blue-600/90"
              )}
            >
              {providerType === "admob" ? "A" : "G"}
            </div>
            Select {providerLabel} Account
          </DialogTitle>
          <DialogDescription className="text-xs">
            Multiple accounts were found. Please select which account you want to connect.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <RadioGroup
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
            className="space-y-2"
          >
            {accounts.map((account) => (
              <label
                key={account.id}
                htmlFor={account.id}
                className={cn(
                  "flex items-center gap-3 rounded border px-3 py-2.5 cursor-pointer transition-colors",
                  selectedAccountId === account.id
                    ? "border-primary bg-primary/5"
                    : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                )}
              >
                <RadioGroupItem value={account.id} id={account.id} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {account.displayName}
                    </span>
                    {selectedAccountId === account.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {providerType === "gam" ? (
                      <>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-border/40 font-mono">
                          {account.identifiers.networkCode}
                        </Badge>
                        {account.identifiers.accountName && (
                          <span className="text-[10px] text-muted-foreground/60 truncate">
                            {account.identifiers.accountName}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        {account.identifiers.publisherId}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleConfirm}
            disabled={!selectedAccountId}
          >
            Connect Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
