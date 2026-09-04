"use client";

import { useSyncExternalStore } from "react";
import type { SessionPayload } from "@/app/api/auth/session/route";

export type SessionUser = NonNullable<SessionPayload["user"]>;

export type SessionState =
  | { status: "loading" }
  /** The deployment carries no accounts configuration; offer nothing. */
  | { status: "disabled" }
  | { status: "anonymous" }
  | { status: "signed-in"; user: SessionUser };

const loadingState: SessionState = { status: "loading" };
const disabledState: SessionState = { status: "disabled" };
const anonymousState: SessionState = { status: "anonymous" };

const listeners = new Set<() => void>();
let state: SessionState = loadingState;
let started = false;

const notify = () => {
  for (const listener of listeners) listener();
};

const setState = (next: SessionState) => {
  state = next;
  notify();
};

const load = () => {
  if (started) return;
  started = true;
  fetch("/api/auth/session", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((payload: SessionPayload | null) => {
      // Only the endpoint saying so means unconfigured. A request that never
      // arrived says nothing, so it falls back to the signed-out state rather
      // than hiding sign-in for the rest of the visit.
      if (payload === null) return setState(anonymousState);
      if (!payload.enabled) return setState(disabledState);
      setState(
        payload.user
          ? { status: "signed-in", user: payload.user }
          : anonymousState,
      );
    })
    .catch(() => setState(anonymousState));
};

const subscribe = (listener: () => void) => {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;
const getServerSnapshot = () => loadingState;

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
