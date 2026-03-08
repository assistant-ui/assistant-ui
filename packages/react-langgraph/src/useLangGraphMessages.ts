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
import { useAui } from "@assistant-ui/react";
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
        for await (const chunk of response) {
          switch (chunk.event) {
            case LangGraphKnownEventTypes.MessagesPartial:
            case LangGraphKnownEventTypes.MessagesComplete:
              setMessagesImmediate(accumulator.addMessages(chunk.data));
              break;
            case LangGraphKnownEventTypes.Updates:
              onUpdates?.(chunk.data);
              if (
                Array.isArray(chunk.data.messages) &&
                !hasTupleMessageEvents
              ) {
                setMessagesImmediate(
                  accumulator.replaceMessages(chunk.data.messages),
                );
              }
              setInterrupt(chunk.data.__interrupt__?.[0]);
              break;
            case LangGraphKnownEventTypes.Values:
              onValues?.(chunk.data);
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
