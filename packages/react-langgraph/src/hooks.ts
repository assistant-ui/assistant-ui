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

/** Read the graph's shared state streamed via values events. */
export const useLangGraphState = <
  TState extends Record<string, unknown> = Record<string, unknown>,
>(): TState | undefined =>
  langGraphExtras.use((e) => e.state as TState | undefined, undefined);

/** Stage an optimistic graph state update that rides the next run input. */
export const useLangGraphSetState = <
  TState extends Record<string, unknown> = Record<string, unknown>,
>() => {
  const aui = useAui();
  return (next: TState | ((prev: TState | undefined) => TState)): void =>
    langGraphExtras
      .get(aui)
      .setState(
        next as
          | Record<string, unknown>
          | ((
              prev: Record<string, unknown> | undefined,
            ) => Record<string, unknown>),
      );
};

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

/** Read the per-message LangGraph tuple metadata, keyed by message ID. */
export const useLangGraphMessageMetadata = () =>
  langGraphExtras.use((e) => e.messageMetadata, EMPTY_MESSAGE_METADATA);

/** Read the accumulated LangSmith Generative UI messages. */
export const useLangGraphUIMessages = () =>
  langGraphExtras.use((e) => e.uiMessages, EMPTY_UI_MESSAGES);
