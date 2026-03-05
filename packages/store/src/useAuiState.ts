"use client";

import { useSyncExternalStore, useDebugValue, useRef } from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";

declare const process: { env: { NODE_ENV?: string } };

/**
 * Hook to access a slice of the assistant state with automatic subscription.
 *
 * **Important:** If your selector returns a new object or array, wrap it with
 * `useShallow` to avoid re-rendering on every state change.
 *
 * @param selector - Function to select a slice of the state.
 *   Return a primitive value directly, or use `useShallow` when returning objects.
 * @returns The selected state slice
 *
 * @example
 * ```typescript
 * // Selecting a single primitive value (GOOD)
 * const text = useAuiState((s) => s.composer.text);
 *
 * // Selecting multiple values with useShallow (GOOD)
 * const { text, isEditing } = useAuiState(
 *   useShallow((s) => ({
 *     text: s.composer.text,
 *     isEditing: s.composer.isEditing,
 *   })),
 * );
 *
 * // Selecting multiple values as separate calls (also GOOD)
 * const text = useAuiState((s) => s.composer.text);
 * const isEditing = useAuiState((s) => s.composer.isEditing);
 *
 * // BAD - creates a new object on every state change, causing re-renders
 * // const { text, isEditing } = useAuiState((s) => ({
 * //   text: s.composer.text,
 * //   isEditing: s.composer.isEditing,
 * // }));
 * ```
 */
export const useAuiState = <T>(selector: (state: AssistantState) => T): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useNewObjectDetection(selector, proxiedState);
  }

  const slice = useSyncExternalStore(
    aui.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );

  if (slice === proxiedState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

const useNewObjectDetection = <T>(
  selector: (state: AssistantState) => T,
  proxiedState: AssistantState,
) => {
  const warnedRef = useRef(false);
  if (warnedRef.current) return;

  const result1 = selector(proxiedState);
  if (typeof result1 === "object" && result1 !== null) {
    const result2 = selector(proxiedState);
    if (result1 !== result2) {
      warnedRef.current = true;
      console.error(
        "useAuiState: Your selector returns a new object on every call. " +
          "This causes unnecessary re-renders on every state change.\n\n" +
          "Either:\n" +
          "  1. Wrap your selector with useShallow():\n" +
          "     useAuiState(useShallow((s) => ({ ... })))\n\n" +
          "  2. Split into multiple useAuiState calls:\n" +
          "     const a = useAuiState((s) => s.foo.a);\n" +
          "     const b = useAuiState((s) => s.foo.b);\n\n" +
          "Learn more: https://www.assistant-ui.com/sdk-error/store/unstable-selector",
      );
    }
  }
};
