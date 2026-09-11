"use client";

import type { MessageTiming } from "@assistant-ui/core";
import { useStreamingTiming } from "@assistant-ui/core/react";
import { createLangChainStreamingTimingAccessors } from "./converter";
import { getMessageType } from "./convertMessages";
import type { LangChainBaseMessage } from "./types";

export const langChainStreamingTimingAccessors =
  createLangChainStreamingTimingAccessors<LangChainBaseMessage>(getMessageType);

/**
 * Tracks per-message streaming timing for LangChain messages. Delegates to
 * the shared `useStreamingTiming` primitive in `@assistant-ui/core/react`,
 * adapted to the `LangChainBaseMessage` shape (`_getType() -> "ai"`, content
 * blocks including text/thinking/reasoning, `tool_calls`).
 */
export const useLangChainStreamingTiming = (
  messages: readonly LangChainBaseMessage[],
  isRunning: boolean,
): Record<string, MessageTiming> =>
  useStreamingTiming(messages, isRunning, langChainStreamingTimingAccessors);
