"use client";

import { useSyncExternalStore } from "react";
import type { DemoUsagePayload } from "@/app/api/demo/usage/route";

export type DemoUsageState =
  | { status: "loading" }
  | { status: "ready"; usage: DemoUsagePayload };

const loadingState: DemoUsageState = { status: "loading" };

// A budget that cannot be read is not a spent budget: the route is the gate, so
// the client settles open rather than sitting in loading and blocking nothing.
const unknownState: DemoUsageState = {
  status: "ready",
  usage: {
    used: 0,
    limit: 0,
    remaining: Number.POSITIVE_INFINITY,
    resetAt: 0,
    signedIn: false,
  },
};

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
      state = usage ? { status: "ready", usage } : unknownState;
      notify();
    })
    .catch(() => {
      state = unknownState;
      notify();
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Re-reads the budget after a send. A read already in flight was issued before
 * the send, so it cannot answer for it; queue a fresh one behind it. */
export function refreshDemoUsage(): void {
  const pending = inFlight;
  if (!pending) {
    void load();
    return;
  }
  void pending.then(() => load());
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
