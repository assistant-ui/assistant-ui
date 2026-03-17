"use client";

import { ThreadListItemRuntime } from "../runtime/ThreadListItemRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAui, useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAui()` with `aui.threadListItem()` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export function useThreadListItemRuntime(options?: {
  optional?: false | undefined;
}): ThreadListItemRuntime;
export function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadListItemRuntime | null;
export function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const aui = useAui();
  const runtime = useAuiState(() =>
    aui.threadListItem.source
      ? (aui.threadListItem().__internal_getRuntime?.() ?? null)
      : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("ThreadListItemRuntime is not available");
  }
  return runtime;
}

/**
 * @deprecated Use `useAuiState((s) => s.threadListItem)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export const useThreadListItem = createStateHookForRuntime(
  useThreadListItemRuntime,
);
