"use client";

import { useSyncExternalStore } from "react";
import { DOCS_URL } from "@/lib/config";

/** What the docs site's /api/auth/session answers. */
export type SessionPayload = {
  enabled: boolean;
  cloudHistory: boolean;
  user: {
    analyticsId: string | null;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export type SessionUser = NonNullable<SessionPayload["user"]>;

/** The visitor's sign-in on assistant-ui.com, which the setup reads across origins with their cookies. */
export type SessionState =
  | { status: "loading" }
  /** The docs deployment carries no accounts configuration; offer nothing. */
  | { status: "disabled" }
  | { status: "anonymous" }
  | { status: "signed-in"; user: SessionUser };

const loadingState: SessionState = { status: "loading" };
const anonymousState: SessionState = { status: "anonymous" };

const listeners = new Set<() => void>();
let state: SessionState = loadingState;
let started = false;

const setState = (next: SessionState) => {
  state = next;
  for (const listener of listeners) listener();
};

/** Reads the session again, as after the visitor signed in in another tab. */
export const refreshSession = () => {
  fetch(`${DOCS_URL}/api/auth/session`, {
    cache: "no-store",
    credentials: "include",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((payload: SessionPayload | null) => {
      if (payload === null) return setState(anonymousState);
      if (!payload.enabled) return setState({ status: "disabled" });
      setState(
        payload.user
          ? { status: "signed-in", user: payload.user }
          : anonymousState,
      );
    })
    .catch(() => setState(anonymousState));
};

const subscribe = (listener: () => void) => {
  if (!started) {
    started = true;
    refreshSession();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => loadingState,
  );
}

/** Sign-in happens on assistant-ui.com, in a tab of its own; the setup reads the session again when the visitor comes back. */
export const signInUrl = () => `${DOCS_URL}/api/auth/login`;
