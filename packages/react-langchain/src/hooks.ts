"use client";

import { useAui } from "@assistant-ui/store";
import type { AssembledToolCall } from "@langchain/react";
import { langChainExtras } from "./runtimeExtras";
import type { LangChainBaseMessage } from "./types";

const EMPTY_TOOL_CALLS: readonly AssembledToolCall[] = [];

const EMPTY_INTERRUPTS: readonly { id?: string; value?: unknown }[] = [];

/**
 * Read the current LangGraph interrupt state from the runtime extras.
 */
export const useLangChainInterruptState = () =>
  langChainExtras.use((e) => e.interrupt, undefined);

/**
 * Read every interrupt pending at the current checkpoint, each with `id`
 * and `value`. Defaults to an empty array. Pair with `useLangChainRespondAll`
 * (keyed by interrupt id) to resolve several at once.
 */
export const useLangChainInterrupts = () =>
  langChainExtras.use(
    (e) => e.interrupts ?? EMPTY_INTERRUPTS,
    EMPTY_INTERRUPTS,
  );

/** Read the last run/hydration error from the runtime extras. */
export const useLangChainError = () =>
  langChainExtras.use((e) => e.error, undefined);

/**
 * Read the root tool calls assembled by `useStream` from the `tools`
 * channel. Defaults to an empty array, so consumers can `.map` without
 * a guard. Useful for rendering pending/streamed tool calls and
 * approval UIs.
 */
export const useLangChainToolCalls = () =>
  langChainExtras.use((e) => e.toolCalls ?? EMPTY_TOOL_CALLS, EMPTY_TOOL_CALLS);

/**
 * Returns a function to submit raw state updates to the LangGraph agent,
 * bypassing the normal message flow. Useful for sending interrupt resume
 * commands.
 */
export const useLangChainSubmit = () => {
  const aui = useAui();
  return (
    values: Record<string, unknown> | null | undefined,
    options?: Record<string, unknown>,
  ) => langChainExtras.get(aui).submit(values, options);
};

/**
 * Resume a LangGraph interrupt with a response payload via
 * `useStream().respond`. Preferred over `useLangChainSendCommand`; it
 * carries the response cleanly and handles interrupt namespaces.
 */
export const useLangChainRespond = () => {
  const aui = useAui();
  return (response: unknown, options?: Record<string, unknown>) =>
    langChainExtras.get(aui).respond(response, options);
};

/**
 * Resume several LangGraph interrupts pending at the same checkpoint in
 * one run via `useStream().respondAll`. Use when a run pauses on multiple
 * interrupts at once; sequential `useLangChainRespond` calls can't service
 * them (the first resume starts a run, stranding the rest).
 */
export const useLangChainRespondAll = () => {
  const aui = useAui();
  return (
    responsesById: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => langChainExtras.get(aui).respondAll(responsesById, options);
};

/**
 * Submit a list of LangChain-shaped messages on the current thread.
 * Parity helper for migrating from `useLangGraphSend`. Routes to
 * `useStream().submit({ [messagesKey]: messages }, options)`.
 */
export const useLangChainSend = () => {
  const aui = useAui();
  return (
    messages: readonly LangChainBaseMessage[],
    options?: Record<string, unknown>,
  ) => {
    const extras = langChainExtras.get(aui);
    return extras.submit({ [extras.messagesKey]: messages }, options);
  };
};

/**
 * Submit a `useStream` command (e.g. interrupt resume). Parity helper
 * for migrating from `useLangGraphSendCommand`. Note that v1's command
 * shape (`{ resume?, goto?, update? }`) differs from the legacy
 * `{ resume: string }` form; to carry a payload, use the input or
 * `stream.respond` instead.
 */
export const useLangChainSendCommand = () => {
  const submit = useLangChainSubmit();
  return (command: Record<string, unknown>) => submit(null, { command });
};

/**
 * Read a custom LangGraph state key from the current thread. Mirrors
 * `useStream().values[key]` from `@langchain/react` and updates when the
 * stream emits new state.
 *
 * @example
 * ```tsx
 * const todos = useLangChainState<Todo[]>("todos");
 * const files = useLangChainState<Record<string, string>>("files", {});
 * ```
 */
export function useLangChainState<T>(key: string): T | undefined;
export function useLangChainState<T>(key: string, defaultValue: T): T;
export function useLangChainState<T>(
  key: string,
  defaultValue?: T,
): T | undefined {
  return langChainExtras.use((e) => {
    const value = e.values[key] as T | undefined;
    return value !== undefined ? value : defaultValue;
  }, defaultValue);
}
