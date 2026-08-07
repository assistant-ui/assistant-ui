import { useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { LangGraphMessageAccumulator } from "./LangGraphMessageAccumulator";
import { abortableIterable, whenAborted } from "./abortableIterable";
import {
  type EventType,
  type LangChainMessageTupleEvent,
  LangGraphKnownEventTypes,
  type LangGraphTupleMetadata,
  type OnMessageChunkCallback,
  type OnValuesEventCallback,
  type OnUpdatesEventCallback,
  type OnSubgraphUpdatesEventCallback,
  type OnSubgraphValuesEventCallback,
  type OnCustomEventCallback,
  type OnErrorEventCallback,
  type OnSubgraphErrorEventCallback,
  type OnInfoEventCallback,
  type OnMetadataEventCallback,
  type RemoveUIMessage,
  type UIMessage,
} from "./types";
import { useAui } from "@assistant-ui/store";
import { normalizeLangGraphTupleMessage } from "./normalizeLangGraphTupleMessage";

const DEFAULT_UI_STATE_KEY = "ui";

type LangGraphEventCallbackName =
  | "onMessageChunk"
  | "onValues"
  | "onUpdates"
  | "onSubgraphValues"
  | "onSubgraphUpdates"
  | "onMetadata"
  | "onInfo"
  | "onError"
  | "onSubgraphError"
  | "onCustomEvent";

const reportCallbackError = (
  name: LangGraphEventCallbackName,
  error: unknown,
) => {
  console.error(`[react-langgraph] ${name} callback threw an error`, error);
};

const invokeEventCallback = <TArgs extends unknown[]>(
  name: LangGraphEventCallbackName,
  callback: ((...args: TArgs) => void | Promise<void>) | undefined,
  ...args: TArgs
) => {
  if (!callback) return;

  try {
    void Promise.resolve(callback(...args)).catch((error) => {
      reportCallbackError(name, error);
    });
  } catch (error) {
    reportCallbackError(name, error);
  }
};

const parseEventType = (
  event: string,
): { type: string; namespace: string | undefined } => {
  const pipeIndex = event.indexOf("|");
  if (pipeIndex === -1) return { type: event, namespace: undefined };
  return {
    type: event.slice(0, pipeIndex),
    namespace: event.slice(pipeIndex + 1),
  };
};

const isUIUpdate = (
  value: unknown,
): value is
  | UIMessage
  | RemoveUIMessage
  | readonly (UIMessage | RemoveUIMessage)[] => {
  if (Array.isArray(value)) return value.every(isUIUpdate);
  if (value == null || typeof value !== "object") return false;
  const v = value as { type?: unknown; id?: unknown };
  if (typeof v.id !== "string") return false;
  return v.type === "ui" || v.type === "remove-ui";
};

export type LangGraphCommand = {
  resume: string;
};

export type LangGraphSendMessageConfig = {
  command?: LangGraphCommand;
  runConfig?: unknown;
  checkpointId?: string;
  state?: Record<string, unknown>;
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
  uiStateKey = DEFAULT_UI_STATE_KEY,
}: {
  stream: LangGraphStreamCallback<TMessage>;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  /**
   * State key under which `typedUi` writes UI messages in the graph state.
   * Must match the `stateKey` option passed to `typedUi(config, { stateKey })`
   * on the server. Defaults to `"ui"`.
   */
  uiStateKey?: string;
  eventHandlers?: {
    onMessageChunk?: OnMessageChunkCallback;
    onValues?: OnValuesEventCallback;
    onUpdates?: OnUpdatesEventCallback;
    onSubgraphValues?: OnSubgraphValuesEventCallback;
    onSubgraphUpdates?: OnSubgraphUpdatesEventCallback;
    onMetadata?: OnMetadataEventCallback;
    onInfo?: OnInfoEventCallback;
    onError?: OnErrorEventCallback;
    onSubgraphError?: OnSubgraphErrorEventCallback;
    onCustomEvent?: OnCustomEventCallback;
  };
}) => {
  const interruptRef = useRef<LangGraphInterruptState | undefined>(undefined);
  const [interrupt, setInterrupt] = useState<
    LangGraphInterruptState | undefined
  >();
  const [messages, _setMessages] = useState<TMessage[]>([]);
  const [values, setValues] = useState<Record<string, unknown> | undefined>();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  interruptRef.current = interrupt;

  const setMessagesImmediate = useCallback((msgs: TMessage[]) => {
    messagesRef.current = msgs;
    _setMessages(msgs);
  }, []);

  const [uiMessages, _setUIMessages] = useState<UIMessage[]>([]);
  const uiMessagesRef = useRef(uiMessages);
  uiMessagesRef.current = uiMessages;

  const activeAccumulatorRef = useRef<
    LangGraphMessageAccumulator<TMessage> | undefined
  >(undefined);

  const setUIMessagesImmediate = useCallback((next: UIMessage[]) => {
    uiMessagesRef.current = next;
    _setUIMessages(next);
  }, []);

  const [messageMetadata, setMessageMetadata] = useState<
    Map<string, LangGraphTupleMetadata>
  >(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    onMessageChunk,
    onValues,
    onUpdates,
    onSubgraphValues,
    onSubgraphUpdates,
    onMetadata,
    onInfo,
    onError,
    onSubgraphError,
    onCustomEvent,
  } = useMemo(() => eventHandlers ?? {}, [eventHandlers]);

  const aui = useAui();
  const sendMessage = useCallback(
    async (
      newMessages: TMessage[],
      config: LangGraphSendMessageConfig,
      onComplete?: () => void,
    ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      let accumulator: LangGraphMessageAccumulator<TMessage> | undefined;
      try {
        // ensure all messages have an ID
        const newMessagesWithId = newMessages.map((m) =>
          m.id ? m : { ...m, id: uuidv4() },
        );

        accumulator = new LangGraphMessageAccumulator({
          initialMessages: messagesRef.current,
          initialUIMessages: uiMessagesRef.current,
          appendMessage,
        });
        activeAccumulatorRef.current = accumulator;
        setMessagesImmediate(accumulator.addMessages(newMessagesWithId));

        // A stream that ignores its abortSignal can park before handing the
        // iterable over, which strands this the same way parking mid-chunk
        // strands the loop below.
        const opened = Promise.resolve(
          stream(newMessagesWithId, {
            ...config,
            abortSignal: abortController.signal,
            initialize: async () => {
              return await aui.threadListItem.initialize();
            },
          }),
        );
        const response = await Promise.race([
          opened,
          whenAborted(abortController.signal),
        ]);
        if (!response) {
          // finalize whatever it eventually hands over, without waiting for it
          void opened
            .then((late) => late?.[Symbol.asyncIterator]().return?.(undefined))
            .catch(() => {});
          return;
        }

        let hasTupleMessageEvents = false;
        let lastValuesMessages: TMessage[] | null = null;
        let lastValuesUIMessages: UIMessage[] | null = null;
        for await (const chunk of abortableIterable(
          response,
          abortController.signal,
        )) {
          // Holds even when the caller's `stream` ignores its abortSignal.
          if (abortController.signal.aborted) break;
          const { type: eventType, namespace: eventNamespace } = parseEventType(
            chunk.event,
          );
          switch (eventType) {
            case LangGraphKnownEventTypes.MessagesPartial:
            case LangGraphKnownEventTypes.MessagesComplete:
              setMessagesImmediate(accumulator.addMessages(chunk.data));
              break;
            case LangGraphKnownEventTypes.Updates: {
              if (eventNamespace) {
                invokeEventCallback(
                  "onSubgraphUpdates",
                  onSubgraphUpdates,
                  eventNamespace,
                  chunk.data,
                );
              } else {
                invokeEventCallback("onUpdates", onUpdates, chunk.data);
              }
              const extracted = extractMessagesFromUpdates<TMessage>(
                chunk.data,
              );
              if (extracted.length > 0) {
                setMessagesImmediate(accumulator.addMessages(extracted));
              }
              // A subgraph update may set an interrupt but never clear one; the parent's top-level update clears it when the subgraph ends.
              const updateInterrupt = chunk.data.__interrupt__?.[0];
              if (!eventNamespace || updateInterrupt !== undefined) {
                setInterrupt(updateInterrupt);
              }
              break;
            }
            case LangGraphKnownEventTypes.Values:
              if (eventNamespace) {
                invokeEventCallback(
                  "onSubgraphValues",
                  onSubgraphValues,
                  eventNamespace,
                  chunk.data,
                );
                break;
              }
              setValues(chunk.data as Record<string, unknown>);
              invokeEventCallback("onValues", onValues, chunk.data);
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
              if (Array.isArray(chunk.data?.[uiStateKey])) {
                // values is a full state snapshot, replace UI list wholesale
                const valuesUIMessages = chunk.data[uiStateKey] as UIMessage[];
                lastValuesUIMessages = valuesUIMessages;
                setUIMessagesImmediate(
                  accumulator.replaceUIMessages(valuesUIMessages),
                );
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

              const tupleMetadataWithNamespace:
                | LangGraphTupleMetadata
                | undefined =
                tupleMetadata || eventNamespace
                  ? {
                      ...(tupleMetadata ?? {}),
                      ...(eventNamespace ? { namespace: eventNamespace } : {}),
                    }
                  : undefined;

              if (normalizedTupleMessage.kind === "chunk") {
                invokeEventCallback(
                  "onMessageChunk",
                  onMessageChunk,
                  normalizedTupleMessage.message,
                  tupleMetadataWithNamespace ?? {},
                );
              }

              const normalizedMessage =
                normalizedTupleMessage.message as unknown as TMessage;
              const updatedMessages = tupleMetadataWithNamespace
                ? accumulator.addMessageWithMetadata(
                    normalizedMessage,
                    tupleMetadataWithNamespace,
                  )
                : accumulator.addMessages([normalizedMessage]);

              setMessagesImmediate(updatedMessages);
              setMessageMetadata(new Map(accumulator.getMetadataMap()));
              break;
            }
            case LangGraphKnownEventTypes.Metadata:
              invokeEventCallback("onMetadata", onMetadata, chunk.data);
              break;
            case LangGraphKnownEventTypes.Info:
              invokeEventCallback("onInfo", onInfo, chunk.data);
              break;
            case LangGraphKnownEventTypes.Error: {
              invokeEventCallback("onError", onError, chunk.data);
              // namespaced errors come from subgraphs, which the parent may recover from
              if (!eventNamespace) {
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
              } else {
                invokeEventCallback(
                  "onSubgraphError",
                  onSubgraphError,
                  eventNamespace,
                  chunk.data,
                );
              }
              break;
            }
            default: {
              // push_ui_message emits ui/remove-ui events on the "custom" channel
              if (eventType === "custom" && isUIUpdate(chunk.data)) {
                setUIMessagesImmediate(accumulator.applyUIUpdate(chunk.data));
                break;
              }
              if (onCustomEvent) {
                invokeEventCallback(
                  "onCustomEvent",
                  onCustomEvent,
                  eventType,
                  chunk.data,
                );
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
        }

        // Final reconcile: use the last values snapshot as authoritative state
        if (lastValuesMessages && !abortController.signal.aborted) {
          setMessagesImmediate(
            hasTupleMessageEvents
              ? accumulator.reconcileMessages(lastValuesMessages)
              : accumulator.replaceMessages(lastValuesMessages),
          );
          setMessageMetadata(new Map(accumulator.getMetadataMap()));
        }
        if (lastValuesUIMessages && !abortController.signal.aborted) {
          setUIMessagesImmediate(
            accumulator.replaceUIMessages(lastValuesUIMessages),
          );
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
        if (activeAccumulatorRef.current === accumulator) {
          activeAccumulatorRef.current = undefined;
        }
        onComplete?.();
      }
    },
    [
      aui,
      setMessagesImmediate,
      setUIMessagesImmediate,
      appendMessage,
      stream,
      uiStateKey,
      onMessageChunk,
      onValues,
      onUpdates,
      onSubgraphValues,
      onSubgraphUpdates,
      onMetadata,
      onInfo,
      onError,
      onSubgraphError,
      onCustomEvent,
    ],
  );

  // Merge a load that started before the current run into what that run has
  // produced since. Anything the run touched is fresher than the snapshot, so
  // it wins on an id collision and keeps its position; the snapshot only
  // contributes history the run has never seen.
  const reconcileMessages = useCallback(
    (
      serverMessages: TMessage[],
      messagesAtLoadStart: TMessage[],
      { snapshotIsComplete = true }: { snapshotIsComplete?: boolean } = {},
    ) => {
      const accumulator = activeAccumulatorRef.current;
      const currentMessages = accumulator?.getMessages() ?? messagesRef.current;
      const baselineIds = new Set(
        messagesAtLoadStart
          .map((message) => message.id)
          .filter((id): id is string => id !== undefined),
      );
      const baselineMessages = new Set(messagesAtLoadStart);
      const serverById = new Map(
        serverMessages
          .filter((message) => message.id !== undefined)
          .map((message) => [message.id as string, message]),
      );
      const liveIds = new Set(
        currentMessages
          .map((message) => message.id)
          .filter((id): id is string => id !== undefined),
      );
      const isRunTouched = (message: TMessage) =>
        message.id !== undefined
          ? !baselineIds.has(message.id) || !baselineMessages.has(message)
          : !baselineMessages.has(message);

      const nextMessages = [
        ...serverMessages.filter(
          (message) => message.id === undefined || !liveIds.has(message.id),
        ),
        ...currentMessages.flatMap((message) => {
          if (isRunTouched(message)) return [message];
          if (message.id !== undefined && serverById.has(message.id))
            return [serverById.get(message.id) as TMessage];
          // Absence is a deletion only when the snapshot is the whole thread.
          return snapshotIsComplete ? [] : [message];
        }),
      ];
      setMessagesImmediate(
        accumulator?.replaceMessages(nextMessages) ?? nextMessages,
      );
      // replaceMessages rebuilds the metadata map, so republish it the way the
      // other accumulator mutations in this file do.
      if (accumulator)
        setMessageMetadata(new Map(accumulator.getMetadataMap()));
    },
    [setMessagesImmediate],
  );

  // Same load boundary as the messages: a snapshot taken before the run
  // started cannot speak for an interrupt that run has since raised.
  const reconcileInterrupt = useCallback(
    (
      serverInterrupt: LangGraphInterruptState | undefined,
      interruptAtLoadStart: LangGraphInterruptState | undefined,
    ) => {
      if (interruptRef.current !== interruptAtLoadStart) return;
      setInterrupt(serverInterrupt);
    },
    [],
  );

  const reconcileUIMessages = useCallback(
    (
      serverMessages: UIMessage[],
      messagesAtLoadStart: UIMessage[],
      { snapshotIsComplete = true }: { snapshotIsComplete?: boolean } = {},
    ) => {
      const accumulator = activeAccumulatorRef.current;
      const currentMessages =
        accumulator?.getUIMessages() ?? uiMessagesRef.current;
      const baselineIds = new Set(
        messagesAtLoadStart.map((message) => message.id),
      );
      const baselineMessages = new Set(messagesAtLoadStart);
      const serverById = new Map(
        serverMessages.map((message) => [message.id, message]),
      );
      const liveIds = new Set(currentMessages.map((message) => message.id));

      const nextMessages = [
        ...serverMessages.filter((message) => !liveIds.has(message.id)),
        ...currentMessages.flatMap((message) => {
          const runTouched =
            !baselineIds.has(message.id) || !baselineMessages.has(message);
          if (runTouched) return [message];
          const fromServer = serverById.get(message.id);
          if (fromServer) return [fromServer];
          return snapshotIsComplete ? [] : [message];
        }),
      ];
      setUIMessagesImmediate(
        accumulator?.replaceUIMessages(nextMessages) ?? nextMessages,
      );
    },
    [setUIMessagesImmediate],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    interrupt,
    values,
    messages,
    messageMetadata,
    uiMessages,
    sendMessage,
    cancel,
    setInterrupt,
    setValues,
    setMessages: setMessagesImmediate,
    setUIMessages: setUIMessagesImmediate,
    reconcileMessages,
    reconcileUIMessages,
    reconcileInterrupt,
  };
};
