import { Skeleton } from "@/atoms/skeleton"

export default function ExperimentDetailLoading() {
  return (
    <div className="w-full px-[var(--page-padding)] pt-16 pb-[var(--page-bottom-gap)]">
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col w-full max-w-page-default">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-[var(--title-to-section)]">
            <div className="space-y-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>

          {/* Report card skeleton */}
          <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border/50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-3 w-16 mx-auto mb-2" />
                  <Skeleton className="h-6 w-20 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Arms skeleton */}
          <div className="flex gap-4 mb-6">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-lg border border-border/50 p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="p-3 rounded-lg bg-muted/30">
                      <Skeleton className="h-2 w-12 mb-2" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-4">
            <Skeleton className="h-5 w-36 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
