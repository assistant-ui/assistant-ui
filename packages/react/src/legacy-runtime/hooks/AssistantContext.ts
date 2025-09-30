"use client";

import { useAssistantApi } from "../../context/react/AssistantApiContext";
import { AssistantRuntime } from "../runtime/AssistantRuntime";
import type { ThreadListRuntime } from "../runtime/ThreadListRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";

/**
 * Hook to access the AssistantRuntime from the current context.
 *
 * The AssistantRuntime provides access to the top-level assistant state and actions,
 * including thread management, tool registration, and configuration.
 *
 * @param options Configuration options
 * @param options.optional Whether the hook should return null if no context is found
 * @returns The AssistantRuntime instance, or null if optional is true and no context exists
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const runtime = useAssistantRuntime();
 *
 *   const handleNewThread = () => {
 *     runtime.switchToNewThread();
 *   };
 *
 *   return <button onClick={handleNewThread}>New Thread</button>;
 * }
 * ```
 */
export function useAssistantRuntime(options?: {
  optional?: false | undefined;
}): AssistantRuntime;
export function useAssistantRuntime(options?: {
  optional?: boolean | undefined;
}): AssistantRuntime | null;
export function useAssistantRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const api = useAssistantApi();
  const runtime = api.__internal_getRuntime?.() ?? null;

  if (!runtime && !options?.optional) {
    throw new Error("AssistantRuntime is not available");
  }

  return runtime;
}

const useThreadListRuntime = (opt: {
  optional: boolean | undefined;
}): ThreadListRuntime | null => useAssistantRuntime(opt)?.threads ?? null;
export const useThreadList = createStateHookForRuntime(useThreadListRuntime);
