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

/** The live Pi thread state, optionally projected through a selector. */
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
