"use client";

import type { DataMessagePart } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAuiState} to select and narrow `s.part`.
 * Return `null` for optional rendering, or throw inside the selector to
 * preserve the old hook's strict behavior.
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
  const part = useAuiState((s) => {
    if (s.part.type !== "data") {
      return null;
    }
    return s.part as DataMessagePart<T>;
  });

  if (!part) {
    return null;
  }

  if (name && part.name !== name) {
    return null;
  }

  return part;
};
