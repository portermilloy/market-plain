function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className ?? ""}`} />;
}

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* heading */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* top movers */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded border border-zinc-800 p-3 flex flex-col gap-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* sector heatmap */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded" />
          ))}
        </div>
      </div>

      {/* two-column: portfolio + watchlist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}
