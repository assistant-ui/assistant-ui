"use client";

import type {
  ReasoningMessagePart,
  MessagePartState,
  MessagePartStatus,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

const EMPTY_REASONING_PART: MessagePartState & ReasoningMessagePart =
  Object.freeze({
    type: "reasoning",
    text: "",
    status: COMPLETE_STATUS,
  });

/**
 * @deprecated Use {@link useAuiState} to select and narrow `s.part`.
 * Return `null` for optional rendering. Do not throw inside the selector:
 * selectors run inside `useSyncExternalStore`'s `getSnapshot`, so a transient
 * part mismatch during thread switches can unmount the React root.
 *
 * @example
 * ```tsx
 * const reasoning = useAuiState((s) => {
 *   if (s.part.type !== "reasoning") return null;
 *   return s.part;
 * });
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartReasoning = () => {
  // Sentinel instead of throw: see useMessagePartText for the invariant.
  const text = useAuiState((s) => {
    if (s.part.type !== "reasoning") return EMPTY_REASONING_PART;

    return s.part as MessagePartState & ReasoningMessagePart;
  });

  return text;
};
