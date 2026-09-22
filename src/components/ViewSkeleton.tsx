import React from 'react';

export function ViewSkeleton({ title }: { title?: string }) {
  return (
    <div className="w-full space-y-6 animate-pulse" role="status" aria-label="Loading module content">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-900">
        <div>
          <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-2" />
          <div className="h-4 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-9 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-900/50 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="h-6 w-28 bg-neutral-300 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-36 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Chart Container Skeleton */}
      <div className="p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-900/50 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-neutral-900">
          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-8 w-56 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 py-2.5">
              <div className="h-4 w-1/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-1/6 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
              <div className="h-4 w-1/6 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
              <div className="h-4 w-1/8 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading {title || 'module'}...</span>
    </div>
  );
}
