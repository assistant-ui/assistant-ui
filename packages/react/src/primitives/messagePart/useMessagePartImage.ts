"use client";

import type {
  ImageMessagePart,
  MessagePartState,
  MessagePartStatus,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

const EMPTY_IMAGE_PART: MessagePartState & ImageMessagePart = Object.freeze({
  type: "image",
  image: "",
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
 * const image = useAuiState((s) => {
 *   if (s.part.type !== "image") return null;
 *   return s.part;
 * });
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartImage = () => {
  // Sentinel instead of throw: see useMessagePartText for the invariant.
  const image = useAuiState((s) => {
    if (s.part.type !== "image") return EMPTY_IMAGE_PART;

    return s.part as MessagePartState & ImageMessagePart;
  });

  return image;
};
