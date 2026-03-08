"use client";

import { useAui } from "@assistant-ui/store";
import { AssistantRuntime } from "../runtime/AssistantRuntime";
import type { ThreadListRuntime } from "../runtime/ThreadListRuntime";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";

/**
 * @deprecated Use `useAui()` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 *
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
 * // Before:
 * function MyComponent() {
 *   const runtime = useAssistantRuntime();
 *   const handleNewThread = () => {
 *     runtime.switchToNewThread();
 *   };
 *   return <button onClick={handleNewThread}>New Thread</button>;
 * }
 *
 * // After:
 * function MyComponent() {
 *   const aui = useAui();
 *   const handleNewThread = () => {
 *     aui.threads().switchToNewThread();
 *   };
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
  const aui = useAui();
  const runtime = aui.threads().__internal_getAssistantRuntime?.() ?? null;

  if (!runtime && !options?.optional) {
    throw new Error("AssistantRuntime is not available");
  }

  return runtime;
}

const useThreadListRuntime = (opt: {
  optional: boolean | undefined;
}): ThreadListRuntime | null => useAssistantRuntime(opt)?.threads ?? null;

/**
 * @deprecated Use `useAuiState((s) => s.threads)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export const useThreadList = createStateHookForRuntime(useThreadListRuntime);
