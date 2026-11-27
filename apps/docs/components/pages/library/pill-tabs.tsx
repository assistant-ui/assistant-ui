"use client";

import { cn } from "@/lib/utils";

export type PillTab<T extends string> = {
  id: T;
  label: string;
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
              "h-9 rounded-full px-4 text-[15px] transition-colors",
              selected
                ? "bg-foreground/[0.06] text-foreground dark:bg-foreground/[0.09]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
