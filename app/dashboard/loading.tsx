// Route-level Suspense fallback for /dashboard and its subroutes.
// Renders the same body-skeleton shape as DashboardContainer's data-loading
// state so the transition from chunk-load -> data-load -> content is visually
// continuous (no jarring flash between three different loading widgets).
//
// The NavBar is provided by app/dashboard/layout.tsx and stays on-screen
// throughout, so this file only fills the main content area.

import { Spinner } from "@/components/ui/spinner";

export default function DashboardChunkLoading() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Status strip skeleton */}
      <div className="relative w-full rounded-lg overflow-hidden border border-[var(--border-soft)] bg-surface-1/90 p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="h-3 w-48 rounded bg-surface-3 animate-pulse" />
          <div className="h-7 w-28 rounded-md bg-surface-3 animate-pulse" />
          <div className="h-8 w-3/4 rounded bg-surface-3 animate-pulse" />
        </div>
      </div>

      {/* Timer skeleton */}
      <div className="h-24 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />

      {/* Inbox + Twintro side-by-side skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <div className="h-48 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
        <div className="h-32 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
      </div>

      {/* QuickActionsCard skeleton */}
      <div className="h-24 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />

      {/* Team section skeletons (full width, stacked) */}
      <div className="h-56 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
      <div className="h-40 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />

      <div className="flex items-center justify-center gap-3 py-2">
        <Spinner size="sm" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-brand opacity-70">
          Booting operator terminal...
        </span>
      </div>
    </div>
  );
}
