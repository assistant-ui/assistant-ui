"use client";

import { MessageRuntime } from "../runtime/MessageRuntime";
import { useAssistantApi, useAssistantState } from "../../context/react";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { EditComposerRuntime } from "../runtime";

/**
 * @deprecated Use `useAssistantApi()` with `api.message()` instead. See migration guide: https://docs.assistant-ui.com/docs/migrations/v0-12
 *
 * Hook to access the MessageRuntime from the current context.
 *
 * The MessageRuntime provides access to message-level state and actions,
 * including message content, status, editing capabilities, and branching.
 *
 * @param options Configuration options
 * @param options.optional Whether the hook should return null if no context is found
 * @returns The MessageRuntime instance, or null if optional is true and no context exists
 *
 * @example
 * ```tsx
 * // Before:
 * function MessageActions() {
 *   const runtime = useMessageRuntime();
 *   const handleReload = () => {
 *     runtime.reload();
 *   };
 *   const handleEdit = () => {
 *     runtime.startEdit();
 *   };
 *   return (
 *     <div>
 *       <button onClick={handleReload}>Reload</button>
 *       <button onClick={handleEdit}>Edit</button>
 *     </div>
 *   );
 * }
 *
 * // After:
 * function MessageActions() {
 *   const api = useAssistantApi();
 *   const handleReload = () => {
 *     api.message().reload();
 *   };
 *   const handleEdit = () => {
 *     api.message().startEdit();
 *   };
 *   return (
 *     <div>
 *       <button onClick={handleReload}>Reload</button>
 *       <button onClick={handleEdit}>Edit</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessageRuntime(options?: {
  optional?: false | undefined;
}): MessageRuntime;
export function useMessageRuntime(options?: {
  optional?: boolean | undefined;
}): MessageRuntime | null;
export function useMessageRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const api = useAssistantApi();
  const runtime = useAssistantState(() =>
    api.message.source
      ? (api.message().__internal_getRuntime?.() ?? null)
      : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("MessageRuntime is not available");
  }
  return runtime;
}

/**
 * @deprecated Use `useAssistantState(({ message }) => message)` instead. See migration guide: https://docs.assistant-ui.com/docs/migrations/v0-12
 *
 * Hook to access the current message state.
 *
 * This hook provides reactive access to the message's state, including content,
 * role, status, and other message-level properties.
 *
 * @param selector Optional selector function to pick specific state properties
 * @returns The selected message state or the entire message state if no selector provided
 *
 * @example
 * ```tsx
 * // Before:
 * function MessageContent() {
 *   const role = useMessage((state) => state.role);
 *   const content = useMessage((state) => state.content);
 *   const isLoading = useMessage((state) => state.status.type === "running");
 *   return (
 *     <div className={`message-${role}`}>
 *       {isLoading ? "Loading..." : content.map(part => part.text).join("")}
 *     </div>
 *   );
 * }
 *
 * // After:
 * function MessageContent() {
 *   const role = useAssistantState(({ message }) => message.role);
 *   const content = useAssistantState(({ message }) => message.content);
 *   const isLoading = useAssistantState(({ message }) => message.status.type === "running");
 *   return (
 *     <div className={`message-${role}`}>
 *       {isLoading ? "Loading..." : content.map(part => part.text).join("")}
 *     </div>
 *   );
 * }
 * ```
 */
export const useMessage = createStateHookForRuntime(useMessageRuntime);

const useEditComposerRuntime = (opt: {
  optional: boolean | undefined;
}): EditComposerRuntime | null => useMessageRuntime(opt)?.composer ?? null;

/**
 * @deprecated Use `useAssistantState(({ message }) => message.composer)` instead. See migration guide: https://docs.assistant-ui.com/docs/migrations/v0-12
 */
export const useEditComposer = createStateHookForRuntime(
  useEditComposerRuntime,
);
