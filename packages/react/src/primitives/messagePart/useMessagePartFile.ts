"use client";

import type {
  FileMessagePart,
  MessagePartState,
  MessagePartStatus,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({ type: "complete" });

const EMPTY_FILE_PART: MessagePartState & FileMessagePart = Object.freeze({
  type: "file",
  data: "",
  mimeType: "",
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
 * const file = useAuiState((s) => {
 *   if (s.part.type !== "file") return null;
 *   return s.part;
 * });
 * ```
 *
 * See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePartFile = () => {
  // Sentinel instead of throw: see useMessagePartText for the invariant.
  const file = useAuiState((s) => {
    if (s.part.type !== "file") return EMPTY_FILE_PART;

    return s.part as MessagePartState & FileMessagePart;
  });

  return file;
};
