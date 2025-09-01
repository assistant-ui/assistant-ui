"use client";

import { ThreadListItemRuntime } from "../../../api/ThreadListItemRuntime";
import { createStateHookForRuntime } from "../utils/createStateHookForRuntime";
import { useAssistantApi } from "..";

export function useThreadListItemRuntime(options?: {
  optional?: false | undefined;
}): ThreadListItemRuntime;
export function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadListItemRuntime | null;
export function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const { actions } = useAssistantApi();
  const runtime = actions.threadListItem.__internal_getRuntime();
  if (!runtime && !options?.optional) {
    throw new Error("ThreadListItemRuntime is not available");
  }
  return runtime;
}

export const useThreadListItem = createStateHookForRuntime(
  useThreadListItemRuntime,
);
