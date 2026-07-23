"use client";

import type {
  TextMessagePart,
  ReasoningMessagePart,
  MessagePartState,
  MessagePartStatus,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

const EMPTY_TEXT_PART: MessagePartState & TextMessagePart = Object.freeze({
  type: "text",
  text: "",
  status: COMPLETE_STATUS,
});

/**
 * @deprecated Use {@link useAuiState} to select and narrow `s.part`.
 * Return `null` for optional rendering, or throw inside the selector to
 * preserve the old hook's strict behavior.
 *
 * @example
 * ```tsx
 * const text = useAuiState((s) => {
 *   if (s.part.type !== "text" && s.part.type !== "reasoning") return null;
 *   return s.part;
 * });
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartText = () => {
  // Runs inside useSyncExternalStore's getSnapshot, where a throw tears down
  // the React root; the module-level frozen sentinel keeps snapshots stable.
  const text = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning")
      return EMPTY_TEXT_PART;

    return s.part as MessagePartState &
      (TextMessagePart | ReasoningMessagePart);
  });

  return text;
};
