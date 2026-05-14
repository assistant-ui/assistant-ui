"use client";

import type {
  TextMessagePart,
  ReasoningMessagePart,
  MessagePartState,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

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
  const text = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning")
      throw new Error(
        "MessagePartText can only be used inside text or reasoning message parts.",
      );

    return s.part as MessagePartState &
      (TextMessagePart | ReasoningMessagePart);
  });

  return text;
};
