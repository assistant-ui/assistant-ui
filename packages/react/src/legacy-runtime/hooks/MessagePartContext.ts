"use client";

import { MessagePartRuntime } from "../runtime/MessagePartRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAui, useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAui()` with `aui.part()` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
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
 * @deprecated Use `useAuiState((s) => s.part)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export const useMessagePart = createStateHookForRuntime(useMessagePartRuntime);
