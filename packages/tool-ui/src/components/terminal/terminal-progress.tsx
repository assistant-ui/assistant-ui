"use client";

import { cn } from "../../utils/cn";

export function TerminalProgress({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full animate-pulse flex-col", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-zinc-600" />
          <div className="h-4 w-48 rounded bg-zinc-600" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-12 rounded bg-zinc-600" />
          <div className="h-6 w-6 rounded bg-zinc-600" />
        </div>
      </div>
      {/* Output skeleton */}
      <div className="flex flex-col gap-1.5 bg-zinc-900 px-4 py-3">
        <div className="h-4 w-3/4 rounded bg-zinc-700" />
        <div className="h-4 w-1/2 rounded bg-zinc-700" />
        <div className="h-4 w-5/6 rounded bg-zinc-700" />
        <div className="h-4 w-2/3 rounded bg-zinc-700" />
      </div>
    </div>
  );
}
