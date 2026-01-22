import { Spinner } from "@/atoms/spinner"

export default function ConversationLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" className="text-muted-foreground" />
    </div>
  )
}
