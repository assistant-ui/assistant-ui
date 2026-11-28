"use client";

import { cn } from "@/lib/utils";

export type PillTab<T extends string> = {
  id: T;
  label: string;
  /** How many items the tab holds right now; a tab at zero is dimmed. The number is not shown, so the row keeps its width. */
  count?: number;
};

export function PillTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  label,
  className,
}: {
  tabs: readonly PillTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-1", className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(tab.id)}
            className={cn(
              "h-9 rounded-full px-3 text-sm transition-colors",
              selected
                ? "bg-foreground/[0.06] text-foreground dark:bg-foreground/[0.09]"
                : "text-muted-foreground hover:text-foreground",
              tab.count === 0 && !selected && "opacity-50",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
