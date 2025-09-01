"use client";

import { MessagePartRuntime } from "../../../api/MessagePartRuntime";
import { createStateHookForRuntime } from "../utils/createStateHookForRuntime";
import { useAssistantApi } from "..";

export function useMessagePartRuntime(options?: {
  optional?: false | undefined;
}): MessagePartRuntime;
export function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}): MessagePartRuntime | null;
export function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const { actions } = useAssistantApi();
  const runtime = actions.part.__internal_getRuntime();
  if (!runtime && !options?.optional) {
    throw new Error("MessagePartRuntime is not available");
  }
  return runtime;
}

export const useMessagePart = createStateHookForRuntime(useMessagePartRuntime);
