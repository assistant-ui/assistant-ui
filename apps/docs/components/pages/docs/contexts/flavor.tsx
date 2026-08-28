"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  createPersistedPreference,
  usePersistedPreference,
} from "@/lib/persisted-preference";

export type UiFlavor = "base" | "radix";

const flavorPreference = createPersistedPreference<UiFlavor>({
  key: "aui-docs-flavor",
  fallback: "base",
  read: (raw) => (raw === "radix" || raw === "base" ? raw : null),
  url: {
    param: "view",
    read: (raw) =>
      raw === "radix-ui" ? "radix" : raw === "base-ui" ? "base" : null,
    write: (value) => (value === "radix" ? "radix-ui" : null),
  },
});

export function setFlavor(next: UiFlavor) {
  flavorPreference.set(next);
}

export function useFlavor(): UiFlavor {
  return usePersistedPreference(flavorPreference);
}

export function Flavored({
  radix,
  base,
}: {
  radix: ReactNode;
  base: ReactNode;
}) {
  return useFlavor() === "base" ? base : radix;
}

const FLAVOR_TABS = [
  ["base", "Base UI"],
  ["radix", "Radix UI"],
] as const;

export function FlavorSwitcher({ className }: { className?: string }) {
  const current = useFlavor();

  return (
    <div
      className={cn(
        "not-prose border-border/60 mt-6 flex items-center gap-5 border-b",
        className,
      )}
    >
      {FLAVOR_TABS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setFlavor(value)}
          aria-pressed={current === value}
          data-active={current === value}
          className="text-muted-foreground hover:text-foreground data-[active=true]:text-foreground after:bg-foreground relative -mb-px pb-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:opacity-0 after:transition-opacity data-[active=true]:after:opacity-100"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
