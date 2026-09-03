"use client";

import { useMemo } from "react";
import { piExtras } from "./piExtras";
import {
  EMPTY_RUNTIME_EXTRAS,
  NOOP_CONTROLLER,
  usePiControllerStateSelector,
} from "./usePiRuntime";
import type { PiRuntimeExtras } from "./runtimeTypes";
import type { PiThreadState } from "./threadState";
import type { PiThreadMetadata } from "../types";

/** The full Pi runtime extras for the active thread. */
export const usePiRuntimeExtras = (): PiRuntimeExtras =>
  piExtras.use((e) => e, EMPTY_RUNTIME_EXTRAS);

/** The active Pi thread's metadata, or `null` when none is attached. */
export const usePiSession = (): PiThreadMetadata | null =>
  piExtras.use((e) => e.metadata, null);

/**
 * The live Pi thread state, optionally projected through a selector.
 *
 * The selected value is compared with `Object.is`, so the component re-renders
 * only when that value changes. A selector returning a new object or array
 * literal re-renders on every controller notification; select primitives or
 * return a memoized reference.
 */
export function usePiThreadState(): PiThreadState;
export function usePiThreadState<T>(selector: (state: PiThreadState) => T): T;
export function usePiThreadState<T>(selector?: (state: PiThreadState) => T) {
  const controller = piExtras.use((e) => e.controller, NOOP_CONTROLLER);
  return usePiControllerStateSelector(
    controller,
    selector ?? ((state) => state as T),
  );
}

/** Pending free-standing host-UI requests plus a responder. */
export const usePiHostUiRequests = () => {
  const extras = piExtras.use((e) => e, undefined);

  return useMemo(
    () => ({
      requests: extras?.hostUiRequests ?? [],
      respond:
        extras?.respondToHostUiRequest ??
        (async () => {
          throw new Error("Pi runtime is not ready yet");
        }),
    }),
    [extras],
  );
};
