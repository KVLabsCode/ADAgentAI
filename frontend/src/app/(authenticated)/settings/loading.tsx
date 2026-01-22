import { Skeleton } from "@/atoms/skeleton"

function SettingsSectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="mt-8 first:mt-0">
      {/* Section header */}
      <Skeleton className="h-4 w-20 mb-3" />
      {/* Card */}
      <div className="rounded-lg border border-border/40 bg-card/50 divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-52" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsLoading() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 space-y-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Settings sections - Linear style */}
      <SettingsSectionSkeleton rows={2} />
      <SettingsSectionSkeleton rows={3} />
      <SettingsSectionSkeleton rows={1} />
      <SettingsSectionSkeleton rows={2} />
    </div>
  )
}
