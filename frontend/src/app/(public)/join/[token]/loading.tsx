import { Spinner } from "@/atoms/spinner"

export default function JoinPageLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading invite...</p>
      </div>
    </div>
  )
}
