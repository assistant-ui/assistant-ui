"use client";

import { useAuiState } from "@assistant-ui/store";
import type { MessageTiming } from "@assistant-ui/core";

/**
 * Hook that returns timing information for the current assistant message.
 *
 * Reads from `message.metadata.timing`.
 *
 * @example
 * ```tsx
 * function MessageStats() {
 *   const timing = useMessageTiming();
 *   if (!timing) return null;
 *   return <span>{timing.tokensPerSecond?.toFixed(1)} tok/s</span>;
 * }
 * ```
 */
export const useMessageTiming = (): MessageTiming | undefined => {
  return useAuiState((s) =>
    s.message.role === "assistant" ? s.message.metadata?.timing : undefined,
  );
};
