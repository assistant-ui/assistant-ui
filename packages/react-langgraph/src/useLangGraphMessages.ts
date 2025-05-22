import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { LangGraphMessageAccumulator } from "./LangGraphMessageAccumulator";
import {
  EventType,
  LangChainMessageTupleEvent,
  LangGraphKnownEventTypes,
  LangChainMessageChunk,
} from "./types";

export type LangGraphCommand = {
  resume: string;
};

export type LangGraphSendMessageConfig = {
  command?: LangGraphCommand;
  runConfig?: unknown;
};

export type LangGraphMessagesEvent<TMessage> = {
  event: EventType;
  data: TMessage[] | any;
};

export type LangGraphStreamCallback<TMessage> = (
  messages: TMessage[],
  config: LangGraphSendMessageConfig & { abortSignal: AbortSignal },
) =>
  | Promise<AsyncGenerator<LangGraphMessagesEvent<TMessage>>>
  | AsyncGenerator<LangGraphMessagesEvent<TMessage>>;

export type LangGraphInterruptState = {
  value?: any;
  resumable?: boolean;
  when: string;
  ns?: string[];
};

const DEFAULT_APPEND_MESSAGE = <TMessage>(
  _: TMessage | undefined,
  curr: TMessage,
) => curr;

const isLangChainMessageChunk = (
  value: unknown,
): value is LangChainMessageChunk => {
  if (!value || typeof value !== "object") return false;
  const chunk = value as any;
  return (
    "type" in chunk &&
    chunk.type === "AIMessageChunk" &&
    (chunk.content === undefined ||
      typeof chunk.content === "string" ||
      Array.isArray(chunk.content)) &&
    (chunk.tool_call_chunks === undefined ||
      Array.isArray(chunk.tool_call_chunks))
  );
};

export const useLangGraphMessages = <TMessage extends { id?: string }>({
  stream,
  appendMessage = DEFAULT_APPEND_MESSAGE,
}: {
  stream: LangGraphStreamCallback<TMessage>;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
}) => {
  const [interrupt, setInterrupt] = useState<
    LangGraphInterruptState | undefined
  >();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (newMessages: TMessage[], config: LangGraphSendMessageConfig) => {
      // ensure all messages have an ID
      const newMessagesWithId = newMessages.map((m) =>
        m.id ? m : { ...m, id: uuidv4() },
      );

      const accumulator = new LangGraphMessageAccumulator({
        initialMessages: messages,
        appendMessage,
      });
      setMessages(accumulator.addMessages(newMessagesWithId));

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const response = await stream(newMessagesWithId, {
        ...config,
        abortSignal: abortController.signal,
      });

      for await (const chunk of response) {
        switch (chunk.event) {
          case LangGraphKnownEventTypes.MessagesPartial:
          case LangGraphKnownEventTypes.MessagesComplete:
            setMessages(accumulator.addMessages(chunk.data));
            break;
          case LangGraphKnownEventTypes.Updates:
            setInterrupt(chunk.data.__interrupt__?.[0]);
            break;
          case LangGraphKnownEventTypes.Messages: {
            const [messageChunk] = (chunk as LangChainMessageTupleEvent).data;
            if (!isLangChainMessageChunk(messageChunk)) {
              console.warn(
                "Received invalid message chunk format:",
                messageChunk,
              );
              break;
            }
            const updatedMessages = accumulator.addMessages([
              messageChunk as unknown as TMessage,
            ]);
            setMessages(updatedMessages);
            break;
          }
          case LangGraphKnownEventTypes.Metadata:
            // currently this is a no-op
            break;
          default:
            console.warn(`The event type ${chunk.event} is not supported.`);
        }
      }
    },
    [messages, stream, appendMessage],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [abortControllerRef]);

  return {
    interrupt,
    messages,
    sendMessage,
    cancel,
    setInterrupt,
    setMessages,
  };
};
