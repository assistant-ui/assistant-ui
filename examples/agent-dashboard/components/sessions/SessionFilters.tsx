"use client";

import { cn } from "@/lib/utils";

export type StatusFilter =
  | "all"
  | "active"
  | "waiting"
  | "completed"
  | "failed"
  | "interrupted";

export interface SessionFiltersProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  className?: string;
}

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "interrupted", label: "Interrupted" },
];

export function SessionFilters({
  status,
  onStatusChange,
  className,
}: SessionFiltersProps) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onStatusChange(filter.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            status === filter.value
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
