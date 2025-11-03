"use client";

import { ThreadListItemRuntime } from "../runtime/ThreadListItemRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAssistantApi, useAssistantState } from "../../context/react";

/**
 * @deprecated Use `useAssistantApi()` with `api.threadListItem()` instead. See migration guide: https://docs.assistant-ui.com/docs/migrations/v0-12
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
  const api = useAssistantApi();
  const runtime = useAssistantState(() =>
    api.threadListItem.source
      ? (api.threadListItem().__internal_getRuntime?.() ?? null)
      : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("ThreadListItemRuntime is not available");
  }
  return runtime;
}

/**
 * @deprecated Use `useAssistantState(({ threadListItem }) => threadListItem)` instead. See migration guide: https://docs.assistant-ui.com/docs/migrations/v0-12
 */
export const useThreadListItem = createStateHookForRuntime(
  useThreadListItemRuntime,
);
