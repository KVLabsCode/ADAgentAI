import { Skeleton } from "@/atoms/skeleton"

export default function ExperimentsLoading() {
  return (
    <div className="w-full px-[var(--page-padding)] pt-16 pb-[var(--page-bottom-gap)]">
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col w-full max-w-page-default">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-[var(--title-to-section)]">
            <div className="space-y-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-36" />
          </div>

          {/* Tabs skeleton */}
          <div className="mb-[var(--section-gap)]">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>

            {/* Experiment cards skeleton */}
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
