"use client";

import type { SourceMessagePart, MessagePartState } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAuiState} to select and narrow `s.part`.
 * Return `null` for optional rendering, or throw inside the selector to
 * preserve the old hook's strict behavior.
 *
 * @example
 * ```tsx
 * const source = useAuiState((s) => {
 *   if (s.part.type !== "source") return null;
 *   return s.part;
 * });
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartSource = () => {
  const source = useAuiState((s) => {
    if (s.part.type !== "source")
      throw new Error(
        "MessagePartSource can only be used inside source message parts.",
      );

    return s.part as MessagePartState & SourceMessagePart;
  });

  return source;
};
