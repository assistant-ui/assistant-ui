"use client";

import { useAui } from "@assistant-ui/store";
import { eveExtras } from "./eveExtras";
import type { EveRuntimeExtras } from "./eveExtras";

const EMPTY_EVENTS: EveRuntimeExtras["events"] = Object.freeze([]);

/** Read the last Eve session error from the runtime extras. */
export const useEveError = () => eveExtras.use((e) => e.error, undefined);

/**
 * Read the current Eve session cursor from the runtime extras. Persist it to
 * resume the session later via `initialSession`. `undefined` when no session
 * exists yet or outside an Eve runtime.
 *
 * With `cloud`, each cloud thread already keeps its session, so there is nothing to persist.
 */
export const useEveSession = (): EveRuntimeExtras["session"] | undefined =>
  eveExtras.use((e) => e.session, undefined);

/**
 * Read the authoritative Eve server event stream from the runtime extras.
 * Defaults to an empty array outside an Eve runtime.
 */
export const useEveEvents = (): EveRuntimeExtras["events"] =>
  eveExtras.use((e) => e.events, EMPTY_EVENTS);

/**
 * Returns a function that starts a new Eve session: it stops reading the
 * current session and clears its events and messages, without cancelling a
 * turn still running on the server. Pending staged messages and tool execution
 * state are discarded. Safe to render
 * outside an Eve runtime; invoking the returned function there throws.
 *
 * With `cloud`, it starts a new thread instead, leaving the current thread and its session in the list.
 */
export const useEveReset = () => {
  const aui = useAui();
  return () => eveExtras.get(aui).reset();
};
