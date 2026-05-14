"use client";

import type { FileMessagePart, MessagePartState } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAuiState} to select and narrow `s.part`.
 * Return `null` for optional rendering, or throw inside the selector to
 * preserve the old hook's strict behavior.
 *
 * @example
 * ```tsx
 * const file = useAuiState((s) => {
 *   if (s.part.type !== "file") return null;
 *   return s.part;
 * });
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartFile = () => {
  const file = useAuiState((s) => {
    if (s.part.type !== "file")
      throw new Error(
        "MessagePartFile can only be used inside file message parts.",
      );

    return s.part as MessagePartState & FileMessagePart;
  });

  return file;
};
