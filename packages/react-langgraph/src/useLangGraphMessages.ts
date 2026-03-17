/// <reference types="@assistant-ui/core/store" />
import { useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { LangGraphMessageAccumulator } from "./LangGraphMessageAccumulator";
import {
  EventType,
  LangChainMessageTupleEvent,
  LangGraphKnownEventTypes,
  LangGraphTupleMetadata,
  OnMessageChunkCallback,
  OnValuesEventCallback,
  OnUpdatesEventCallback,
  OnCustomEventCallback,
  OnErrorEventCallback,
  OnInfoEventCallback,
  OnMetadataEventCallback,
} from "./types";
import { useAui } from "@assistant-ui/store";
import { normalizeLangGraphTupleMessage } from "./normalizeLangGraphTupleMessage";

export type LangGraphCommand = {
  resume: string;
};

export type LangGraphSendMessageConfig = {
  command?: LangGraphCommand;
  runConfig?: unknown;
  checkpointId?: string;
};

export type LangGraphMessagesEvent<TMessage> = {
  event: EventType;
  data: TMessage[] | any;
};

export type LangGraphStreamCallback<TMessage> = (
  messages: TMessage[],
  config: LangGraphSendMessageConfig & {
    abortSignal: AbortSignal;
    initialize: () => Promise<{
      remoteId: string;
      externalId: string | undefined;
    }>;
  },
) =>
  | Promise<AsyncGenerator<LangGraphMessagesEvent<TMessage>>>
  | AsyncGenerator<LangGraphMessagesEvent<TMessage>>;

export type LangGraphInterruptState = {
  value?: any;
  resumable?: boolean;
  when?: string;
  ns?: string[];
};

const ROLE_TO_TYPE: Record<string, string> = {
  user: "human",
  assistant: "ai",
  system: "system",
  tool: "tool",
};

const normalizeMessageType = <TMessage>(message: TMessage): TMessage => {
  const msg = message as Record<string, unknown>;
  if (msg.type) return message;
  const role = msg.role as string | undefined;
  if (role && role in ROLE_TO_TYPE) {
    const { role: _, ...rest } = msg;
    return { ...rest, type: ROLE_TO_TYPE[role] } as TMessage;
  }
  return message;
};

const extractMessagesFromUpdates = <TMessage>(
  data: Record<string, unknown>,
): TMessage[] => {
  // { messages: [...] } shape
  if (Array.isArray(data.messages)) {
    return (data.messages as TMessage[]).map(normalizeMessageType);
  }

  // { nodeName: { messages: [...] } } shape
  const messages: TMessage[] = [];
  for (const value of Object.values(data)) {
    if (value && typeof value === "object" && "messages" in value) {
      const nodeMessages = (value as Record<string, unknown>).messages;
      if (Array.isArray(nodeMessages)) {
        messages.push(
          ...(nodeMessages as TMessage[]).map(normalizeMessageType),
        );
      }
    }
  }
  return messages;
};

const extractNewMessagesFromValues = <TMessage extends { id?: string }>(
  valuesMessages: TMessage[],
  accumulator: LangGraphMessageAccumulator<TMessage>,
): TMessage[] => {
  const existing = new Set(
    accumulator
      .getMessages()
      .map((m) => m.id)
      .filter(Boolean),
  );
  return valuesMessages.filter((m) => m.id && !existing.has(m.id));
};

const DEFAULT_APPEND_MESSAGE = <TMessage>(
  _: TMessage | undefined,
  curr: TMessage,
) => curr;

export const useLangGraphMessages = <TMessage extends { id?: string }>({
  stream,
  appendMessage = DEFAULT_APPEND_MESSAGE,
  eventHandlers,
}: {
  stream: LangGraphStreamCallback<TMessage>;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  eventHandlers?: {
    onMessageChunk?: OnMessageChunkCallback;
    onValues?: OnValuesEventCallback;
    onUpdates?: OnUpdatesEventCallback;
    onMetadata?: OnMetadataEventCallback;
    onInfo?: OnInfoEventCallback;
    onError?: OnErrorEventCallback;
    onCustomEvent?: OnCustomEventCallback;
  };
}) => {
  const [interrupt, setInterrupt] = useState<
    LangGraphInterruptState | undefined
  >();
  const [messages, _setMessages] = useState<TMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const setMessagesImmediate = useCallback((msgs: TMessage[]) => {
    messagesRef.current = msgs;
    _setMessages(msgs);
  }, []);

  const [messageMetadata, setMessageMetadata] = useState<
    Map<string, LangGraphTupleMetadata>
  >(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    onMessageChunk,
    onValues,
    onUpdates,
    onMetadata,
    onInfo,
    onError,
    onCustomEvent,
  } = useMemo(() => eventHandlers ?? {}, [eventHandlers]);

  const aui = useAui();
  const sendMessage = useCallback(
    async (newMessages: TMessage[], config: LangGraphSendMessageConfig) => {
      // ensure all messages have an ID
      const newMessagesWithId = newMessages.map((m) =>
        m.id ? m : { ...m, id: uuidv4() },
      );

      const accumulator = new LangGraphMessageAccumulator({
        initialMessages: messagesRef.current,
        appendMessage,
      });
      setMessagesImmediate(accumulator.addMessages(newMessagesWithId));

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        const response = await stream(newMessagesWithId, {
          ...config,
          abortSignal: abortController.signal,
          initialize: async () => {
            return await aui.threadListItem().initialize();
          },
        });

        let hasTupleMessageEvents = false;
        let lastValuesMessages: TMessage[] | null = null;
        for await (const chunk of response) {
          switch (chunk.event) {
            case LangGraphKnownEventTypes.MessagesPartial:
            case LangGraphKnownEventTypes.MessagesComplete:
              setMessagesImmediate(accumulator.addMessages(chunk.data));
              break;
            case LangGraphKnownEventTypes.Updates: {
              onUpdates?.(chunk.data);
              const extracted = extractMessagesFromUpdates<TMessage>(
                chunk.data,
              );
              if (extracted.length > 0) {
                setMessagesImmediate(accumulator.addMessages(extracted));
              }
              setInterrupt(chunk.data.__interrupt__?.[0]);
              break;
            }
            case LangGraphKnownEventTypes.Values:
              onValues?.(chunk.data);
              if (Array.isArray(chunk.data?.messages)) {
                lastValuesMessages = chunk.data.messages;
                if (hasTupleMessageEvents) {
                  const newMessages = extractNewMessagesFromValues(
                    chunk.data.messages,
                    accumulator,
                  );
                  if (newMessages.length > 0) {
                    setMessagesImmediate(accumulator.addMessages(newMessages));
                  }
                } else {
                  setMessagesImmediate(
                    accumulator.replaceMessages(chunk.data.messages),
                  );
                }
              }
              break;
            case LangGraphKnownEventTypes.Messages: {
              hasTupleMessageEvents = true;
              const [tupleMessage, tupleMetadata] = (
                chunk as LangChainMessageTupleEvent
              ).data;
              const normalizedTupleMessage =
                normalizeLangGraphTupleMessage(tupleMessage);
              if (!normalizedTupleMessage) {
                console.warn(
                  "Received invalid messages tuple format:",
                  tupleMessage,
                );
                break;
              }

              if (normalizedTupleMessage.kind === "chunk") {
                onMessageChunk?.(
                  normalizedTupleMessage.message,
                  tupleMetadata ?? {},
                );
              }

              const normalizedMessage =
                normalizedTupleMessage.message as unknown as TMessage;
              const updatedMessages = tupleMetadata
                ? accumulator.addMessageWithMetadata(
                    normalizedMessage,
                    tupleMetadata,
                  )
                : accumulator.addMessages([normalizedMessage]);

              setMessagesImmediate(updatedMessages);
              setMessageMetadata(new Map(accumulator.getMetadataMap()));
              break;
            }
            case LangGraphKnownEventTypes.Metadata:
              onMetadata?.(chunk.data);
              break;
            case LangGraphKnownEventTypes.Info:
              onInfo?.(chunk.data);
              break;
            case LangGraphKnownEventTypes.Error: {
              onError?.(chunk.data);
              // Update the last AI message with error status
              // Assumes last AI message is the one the error relates to
              const messages = accumulator.getMessages();
              const lastAiMessage = messages.findLast(
                (m): m is TMessage & { type: string; id: string } =>
                  m != null && "type" in m && m.type === "ai" && m.id != null,
              );
              if (lastAiMessage) {
                const errorMessage = {
                  ...lastAiMessage,
                  status: {
                    type: "incomplete" as const,
                    reason: "error" as const,
                    error: chunk.data,
                  },
                };
                setMessagesImmediate(accumulator.addMessages([errorMessage]));
              }
              break;
            }
            default:
              if (onCustomEvent) {
                onCustomEvent(chunk.event, chunk.data);
              } else {
                console.warn(
                  "Unhandled event received:",
                  chunk.event,
                  chunk.data,
                );
              }
              break;
          }
        }

        // Final reconcile: use the last values snapshot as authoritative state
        if (lastValuesMessages && !abortController.signal.aborted) {
          setMessagesImmediate(accumulator.replaceMessages(lastValuesMessages));
          setMessageMetadata(new Map(accumulator.getMetadataMap()));
        }
      } catch (error) {
        if (
          !abortController.signal.aborted &&
          !(error instanceof Error && error.name === "AbortError")
        ) {
          throw error;
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      aui,
      setMessagesImmediate,
      appendMessage,
      stream,
      onMessageChunk,
      onValues,
      onUpdates,
      onMetadata,
      onInfo,
      onError,
      onCustomEvent,
    ],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    interrupt,
    messages,
    messageMetadata,
    sendMessage,
    cancel,
    setInterrupt,
    setMessages: setMessagesImmediate,
  };
};
