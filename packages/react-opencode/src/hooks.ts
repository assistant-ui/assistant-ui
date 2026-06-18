"use client";

import { useMemo } from "react";
import { openCodeExtras } from "./openCodeExtras";
import { EMPTY_OPENCODE_THREAD_STATE } from "./openCodeThreadState";
import type { OpenCodeRuntimeExtras, OpenCodeThreadState } from "./types";

/** Read the full OpenCode runtime extras. Throws outside an OpenCode runtime. */
export const useOpenCodeRuntimeExtras = (): OpenCodeRuntimeExtras =>
  openCodeExtras.use();

/** Read the active OpenCode session, or `null` when none is attached. */
export const useOpenCodeSession = () =>
  openCodeExtras.use((e) => e.session, null);

/** Read the OpenCode thread state, optionally projected through a selector. */
export function useOpenCodeThreadState(): OpenCodeThreadState;
export function useOpenCodeThreadState<T>(
  selector: (state: OpenCodeThreadState) => T,
): T;
export function useOpenCodeThreadState<T>(
  selector?: (state: OpenCodeThreadState) => T,
) {
  return openCodeExtras.use(
    (e) => (selector ? selector(e.state) : e.state),
    selector
      ? selector(EMPTY_OPENCODE_THREAD_STATE)
      : EMPTY_OPENCODE_THREAD_STATE,
  );
}

/** Pending permission requests plus a reply action. */
export const useOpenCodePermissions = () => {
  const extras = openCodeExtras.use((e) => e, undefined);

  return useMemo(
    () => ({
      pending: extras
        ? (Object.values(extras.permissions) as Array<
            OpenCodeRuntimeExtras["permissions"][string]
          >)
        : [],
      reply:
        extras?.replyToPermission ??
        (async () => {
          throw new Error("OpenCode runtime is not ready yet");
        }),
    }),
    [extras],
  );
};

/** Pending question requests. */
export const useOpenCodeQuestions = () => {
  const extras = openCodeExtras.use((e) => e, undefined);

  return useMemo(
    () =>
      extras
        ? (Object.values(extras.questions) as Array<
            OpenCodeRuntimeExtras["questions"][string]
          >)
        : [],
    [extras],
  );
};
