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

/**
 * A read already in flight was issued before whatever prompted the reload, so
 * it cannot answer for it; queue a fresh one behind it.
 */
function reload(): Promise<void> {
  const pending = inFlight;
  return pending ? pending.then(() => load()) : load();
}

/** Re-reads the budget after a send. */
export function refreshDemoUsage(): void {
  void reload();
}

/**
 * The budget as of now, for a caller that cannot subscribe. The assistant reads
 * it through a tool when the visitor asks what they have left, and a stale
 * answer there is worse than the round trip.
 */
export async function readDemoUsage(): Promise<DemoUsagePayload | null> {
  await reload();
  // The composer settles open on a budget it could not read, which is the right
  // answer for a gate and the wrong one to report: the route always carries a
  // limit, so its absence means unread rather than unlimited.
  if (state.status !== "ready" || state.usage.limit <= 0) return null;
  return state.usage;
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
