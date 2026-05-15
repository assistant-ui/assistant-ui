"use client";

import type { MessagePartRuntime } from "../runtime/MessagePartRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAui, useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAui} with `aui.part()` instead. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export function useMessagePartRuntime(options?: {
  optional?: false | undefined;
}): MessagePartRuntime;
export function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}): MessagePartRuntime | null;
export function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const aui = useAui();
  const runtime = useAuiState(() =>
    aui.part.source ? (aui.part().__internal_getRuntime?.() ?? null) : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("MessagePartRuntime is not available");
  }
  return runtime;
}

/**
 * @deprecated Use {@link useAuiState}: `useAuiState((s) => s.part)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useMessagePart = createStateHookForRuntime(useMessagePartRuntime);
