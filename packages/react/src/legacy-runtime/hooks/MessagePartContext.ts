"use client";

import { MessagePartRuntime } from "../runtime/MessagePartRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { useAssistantApi, useAssistantState } from "../../context/react";

export function useMessagePartRuntime(options?: {
  optional?: false | undefined;
}): MessagePartRuntime;
export function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}): MessagePartRuntime | null;
export function useMessagePartRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const api = useAssistantApi();
  const runtime = useAssistantState(() =>
    api.part.source ? (api.part().__internal_getRuntime?.() ?? null) : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("MessagePartRuntime is not available");
  }
  return runtime;
}

export const useMessagePart = createStateHookForRuntime(useMessagePartRuntime);
