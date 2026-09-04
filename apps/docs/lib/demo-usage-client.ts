"use client";

import { useSyncExternalStore } from "react";
import type { DemoUsagePayload } from "@/app/api/demo/usage/route";

export type DemoUsageState =
  | { status: "loading" }
  | { status: "ready"; usage: DemoUsagePayload };

const loadingState: DemoUsageState = { status: "loading" };

const listeners = new Set<() => void>();
let state: DemoUsageState = loadingState;
let inFlight: Promise<void> | null = null;

const notify = () => {
  for (const listener of listeners) listener();
};

function load(): Promise<void> {
  inFlight ??= fetch("/api/demo/usage", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((usage: DemoUsagePayload | null) => {
      if (usage) {
        state = { status: "ready", usage };
        notify();
      }
    })
    .catch(() => {})
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Re-reads the budget after a send, so a second tab cannot leave it stale. */
export function refreshDemoUsage(): void {
  void load();
}

const subscribe = (listener: () => void) => {
  void load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;
const getServerSnapshot = () => loadingState;

export function useDemoUsage(): DemoUsageState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
