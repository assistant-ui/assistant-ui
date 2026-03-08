"use client";

import { useState } from "react";
import { ThreadRuntime } from "../runtime/ThreadRuntime";
import { ModelContext } from "../../model-context";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime";
import { ThreadComposerRuntime } from "../runtime";
import { useAui, useAuiEvent, useAuiState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAui()` with `aui.thread()` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 *
 * Hook to access the ThreadRuntime from the current context.
 *
 * The ThreadRuntime provides access to thread-level state and actions,
 * including message management, thread state, and composer functionality.
 *
 * @param options Configuration options
 * @param options.optional Whether the hook should return null if no context is found
 * @returns The ThreadRuntime instance, or null if optional is true and no context exists
 *
 * @example
 * ```tsx
 * // Before:
 * function MyComponent() {
 *   const runtime = useThreadRuntime();
 *   const handleSendMessage = (text: string) => {
 *     runtime.append({ role: "user", content: [{ type: "text", text }] });
 *   };
 *   return <button onClick={() => handleSendMessage("Hello!")}>Send</button>;
 * }
 *
 * // After:
 * function MyComponent() {
 *   const aui = useAui();
 *   const handleSendMessage = (text: string) => {
 *     aui.thread().append({ role: "user", content: [{ type: "text", text }] });
 *   };
 *   return <button onClick={() => handleSendMessage("Hello!")}>Send</button>;
 * }
 * ```
 */
export function useThreadRuntime(options?: {
  optional?: false | undefined;
}): ThreadRuntime;
export function useThreadRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadRuntime | null;
export function useThreadRuntime(options?: { optional?: boolean | undefined }) {
  const aui = useAui();
  const runtime = useAuiState(() =>
    aui.thread.source ? (aui.thread().__internal_getRuntime?.() ?? null) : null,
  );
  if (!runtime && !options?.optional) {
    throw new Error("ThreadRuntime is not available");
  }
  return runtime;
}

/**
 * @deprecated Use `useAuiState((s) => s.thread)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 *
 * Hook to access the current thread state.
 *
 * This hook provides reactive access to the thread's state, including messages,
 * running status, capabilities, and other thread-level properties.
 *
 * @param selector Optional selector function to pick specific state properties
 * @returns The selected thread state or the entire thread state if no selector provided
 *
 * @example
 * ```tsx
 * // Before:
 * function ThreadStatus() {
 *   const isRunning = useThread((state) => state.isRunning);
 *   const messageCount = useThread((state) => state.messages.length);
 *   return <div>Running: {isRunning}, Messages: {messageCount}</div>;
 * }
 *
 * // After:
 * function ThreadStatus() {
 *   const isRunning = useAuiState((s) => s.thread.isRunning);
 *   const messageCount = useAuiState((s) => s.thread.messages.length);
 *   return <div>Running: {isRunning}, Messages: {messageCount}</div>;
 * }
 * ```
 */
export const useThread = createStateHookForRuntime(useThreadRuntime);

const useThreadComposerRuntime = (opt: {
  optional: boolean | undefined;
}): ThreadComposerRuntime | null => useThreadRuntime(opt)?.composer ?? null;

/**
 * @deprecated Use `useAuiState((s) => s.thread.composer)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export const useThreadComposer = createStateHookForRuntime(
  useThreadComposerRuntime,
);

/**
 * @deprecated Use `useAuiState((s) => s.thread.modelContext)` instead. See migration guide: https://assistant-ui.com/docs/migrations/v0-12
 */
export function useThreadModelContext(options?: {
  optional?: false | undefined;
}): ModelContext;
export function useThreadModelContext(options?: {
  optional?: boolean | undefined;
}): ModelContext | null;
export function useThreadModelContext(options?: {
  optional?: boolean | undefined;
}): ModelContext | null {
  const [, rerender] = useState({});

  const runtime = useThreadRuntime(options);
  useAuiEvent("thread.modelContextUpdate", () => rerender({}));

  if (!runtime) return null;
  return runtime?.getModelContext();
}
