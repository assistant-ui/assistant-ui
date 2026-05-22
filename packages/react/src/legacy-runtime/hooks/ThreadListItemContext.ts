"use client";

import type { ThreadListItemRuntime } from "../runtime/ThreadListItemRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAui, useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use {@link useAui} with `aui.threadListItem()` instead. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
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
 * @deprecated Use {@link useAuiState}: `useAuiState((s) => s.threadListItem)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
 */
export const useThreadListItem = createStateHookForRuntime(
  useThreadListItemRuntime,
);
