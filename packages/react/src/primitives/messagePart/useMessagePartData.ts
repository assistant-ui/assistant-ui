"use client";

import type { DataMessagePart } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAuiState} to select and narrow `s.part`.
 * Return `null` for optional rendering. Do not throw inside the selector:
 * selectors run inside `useSyncExternalStore`'s `getSnapshot`, so a transient
 * part mismatch during thread switches can unmount the React root.
 *
 * @example
 * ```tsx
 * const part = useAuiState((s) =>
 *   s.part.type === "data" && (!name || s.part.name === name)
 *     ? s.part
 *     : null,
 * );
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartData = <T = any>(name?: string) => {
  const partState = useAuiState("part");
  if (partState.type !== "data") {
    return null;
  }
  const part = partState as DataMessagePart<T>;

  if (name && part.name !== name) {
    return null;
  }

  return part;
};
