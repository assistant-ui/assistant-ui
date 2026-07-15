"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { aiSDKExtras } from "./aiSDKExtras";

/**
 * Read the raw AI SDK chat status (`"submitted" | "streaming" | "ready" |
 * "error"`) from the runtime extras. Unlike `thread.isRunning`, this does not
 * account for client-side tool executions. `undefined` when the current
 * thread is not backed by the AI SDK runtime.
 */
export const useAISDKStatus = () => aiSDKExtras.use((e) => e.status, undefined);

/**
 * Read the last AI SDK chat error object from the runtime extras.
 * `undefined` when there is no error or the current thread is not backed by
 * the AI SDK runtime.
 */
export const useAISDKError = () => aiSDKExtras.use((e) => e.error, undefined);

/**
 * The underlying `useChat` helpers handle, for advanced views — reach
 * `resumeStream`, `clearError`, or the raw `sendMessage` without forking the
 * runtime hook. `undefined` when the current thread is not backed by the AI
 * SDK runtime.
 */
export const useAISDKChat = <UI_MESSAGE extends UIMessage = UIMessage>() =>
  aiSDKExtras.use((e) => e.chat, undefined) as
    | UseChatHelpers<UI_MESSAGE>
    | undefined;
