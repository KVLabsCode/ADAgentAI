import { Spinner } from "@/atoms/spinner"

export default function AuthLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Spinner size="lg" className="mx-auto text-muted-foreground" />
      </div>
    </main>
  )
}
