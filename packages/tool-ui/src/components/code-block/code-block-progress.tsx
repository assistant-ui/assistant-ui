"use client";

import { cn } from "../../utils/cn";

export function CodeBlockProgress({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full animate-pulse flex-col gap-2", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="bg-muted h-4 w-20 rounded" />
        <div className="bg-muted h-6 w-6 rounded" />
      </div>
      {/* Code lines skeleton */}
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <div className="bg-muted h-4 w-3/4 rounded" />
        <div className="bg-muted h-4 w-1/2 rounded" />
        <div className="bg-muted h-4 w-5/6 rounded" />
        <div className="bg-muted h-4 w-2/3 rounded" />
        <div className="bg-muted h-4 w-4/5 rounded" />
      </div>
    </div>
  );
}
