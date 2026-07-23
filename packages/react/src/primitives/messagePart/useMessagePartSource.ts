"use client";

import type {
  SourceMessagePart,
  MessagePartState,
  MessagePartStatus,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

const EMPTY_SOURCE_PART: MessagePartState & SourceMessagePart = Object.freeze({
  type: "source",
  sourceType: "url",
  id: "",
  url: "",
  status: COMPLETE_STATUS,
});

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
  // Sentinel instead of throw: see useMessagePartText for the invariant.
  const source = useAuiState((s) => {
    if (s.part.type !== "source") return EMPTY_SOURCE_PART;

    return s.part as MessagePartState & SourceMessagePart;
  });

  return source;
};
