"use client";

import { useAui } from "@assistant-ui/store";
import { eveExtras } from "./eveExtras";
import type { EveRuntimeExtras } from "./eveExtras";

const EMPTY_EVENTS: EveRuntimeExtras["events"] = [];

/** Read the last Eve session error from the runtime extras. */
export const useEveError = () => eveExtras.use((e) => e.error, undefined);

/**
 * Read the current Eve session cursor from the runtime extras. Persist it to
 * resume the session later via `initialSession`. `undefined` outside an Eve
 * runtime.
 */
export const useEveSession = () => eveExtras.use((e) => e.session, undefined);

/**
 * Read the authoritative Eve server event stream from the runtime extras.
 * Defaults to an empty array outside an Eve runtime.
 */
export const useEveEvents = () =>
  eveExtras.use((e) => e.events ?? EMPTY_EVENTS, EMPTY_EVENTS);

/**
 * Returns a function that resets the Eve session: aborts any in-flight turn,
 * recreates the owned session, and clears events and projected data.
 */
export const useEveReset = () => {
  const aui = useAui();
  return () => eveExtras.get(aui).reset();
};
