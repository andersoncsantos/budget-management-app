/**
 * Layout-matched skeleton primitives to prevent Cumulative Layout Shift (CLS) (§4.2, §8).
 */

export interface SkeletonProps {
  readonly className?: string;
  readonly label?: string;
}

export function Skeleton({ className = 'h-4 w-full', label = 'Carregando...' }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`animate-pulse rounded-lg bg-bg-elevated ${className}`.trim()}
    />
  );
}

export function CardSkeleton({ label = 'Carregando indicador...' }: { readonly label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-default flex flex-col gap-3 min-h-[140px]"
    >
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-bg-elevated animate-pulse" />
        <div className="h-3 w-28 rounded bg-bg-elevated animate-pulse" />
      </div>
      <div className="space-y-2 mt-1">
        <div className="h-3 w-24 rounded bg-bg-elevated animate-pulse" />
        <div className="h-8 w-40 rounded bg-bg-elevated animate-pulse" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ label = 'Carregando gráfico...' }: { readonly label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-default space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-bg-elevated animate-pulse" />
          <div className="h-3 w-32 rounded bg-bg-elevated animate-pulse" />
        </div>
        <div className="h-8 w-28 rounded-lg bg-bg-elevated animate-pulse" />
      </div>
      <div className="h-80 w-full rounded-xl bg-bg-elevated animate-pulse" />
    </div>
  );
}
