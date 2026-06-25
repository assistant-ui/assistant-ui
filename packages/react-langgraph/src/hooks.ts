"use client";

import { useAui } from "@assistant-ui/store";
import { langGraphExtras } from "./runtimeExtras";
import type {
  LangChainMessage,
  LangGraphTupleMetadata,
  UIMessage,
} from "./types";
import type {
  LangGraphCommand,
  LangGraphSendMessageConfig,
} from "./useLangGraphMessages";

const EMPTY_UI_MESSAGES: readonly UIMessage[] = Object.freeze([]);
const EMPTY_MESSAGE_METADATA: Map<string, LangGraphTupleMetadata> = new Map();

/** Read the current LangGraph interrupt state from the runtime extras. */
export const useLangGraphInterruptState = () =>
  langGraphExtras.use((e) => e.interrupt, undefined);

/** Submit raw LangChain-shaped messages to the active LangGraph thread. */
export const useLangGraphSend = () => {
  const aui = useAui();
  return (messages: LangChainMessage[], config: LangGraphSendMessageConfig) =>
    langGraphExtras.get(aui).send(messages, config);
};

/** Submit a LangGraph command (e.g. an interrupt resume). */
export const useLangGraphSendCommand = () => {
  const send = useLangGraphSend();
  return (command: LangGraphCommand) => send([], { command });
};

/**
 * Replace the active thread's LangChain message list directly, bypassing the
 * stream. Accepts an array or a functional updater. Use for history pagination
 * (prepend an older page: `setMessages((prev) => [...older, ...prev])`) or
 * optimistic edits while the thread is idle. Throws if called while a run is in
 * progress, because the running stream owns the list during a turn; the next
 * run re-seeds from the current list, so an idle-time replacement becomes the
 * base for the next run.
 */
export const useLangGraphSetMessages = () => {
  const aui = useAui();
  return (
    messages:
      | LangChainMessage[]
      | ((prev: LangChainMessage[]) => LangChainMessage[]),
  ) => langGraphExtras.get(aui).setMessages(messages);
};

/** Read the per-message LangGraph tuple metadata, keyed by message ID. */
export const useLangGraphMessageMetadata = () =>
  langGraphExtras.use((e) => e.messageMetadata, EMPTY_MESSAGE_METADATA);

/** Read the accumulated LangSmith Generative UI messages. */
export const useLangGraphUIMessages = () =>
  langGraphExtras.use((e) => e.uiMessages, EMPTY_UI_MESSAGES);
