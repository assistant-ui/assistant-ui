"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type UiFlavor = "base" | "radix";

const STORAGE_KEY = "aui-docs-flavor";
const PARAM = "view";

let flavor: UiFlavor = "base";
let hydrated = false;
const listeners = new Set<() => void>();

function readStoredFlavor(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readCurrent(): UiFlavor {
  if (typeof window === "undefined") return "base";
  const param = new URLSearchParams(window.location.search).get(PARAM);
  if (param === "radix-ui") return "radix";
  if (param === "base-ui") return "base";
  return readStoredFlavor() === "radix" ? "radix" : "base";
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    flavor = readCurrent();
    window.addEventListener("popstate", () => {
      flavor = readCurrent();
      emit();
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFlavor(next: UiFlavor) {
  flavor = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be blocked (private mode, quota); the in-memory value and
    // the url parameter still carry the selection.
  }
  const url = new URL(window.location.href);
  if (next === "radix") {
    url.searchParams.set(PARAM, "radix-ui");
  } else {
    url.searchParams.delete(PARAM);
  }
  window.history.replaceState(window.history.state, "", url);
  emit();
}

export function useFlavor(): UiFlavor {
  return useSyncExternalStore(
    subscribe,
    () => flavor,
    () => "base" as const,
  );
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
