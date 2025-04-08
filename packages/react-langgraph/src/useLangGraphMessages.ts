import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { LangGraphMessageAccumulator } from "./LangGraphMessageAccumulator";

export type LangGraphCommand = {
  resume: string;
};

export type LangGraphSendMessageConfig = {
  command?: LangGraphCommand;
  runConfig?: unknown;
};

type LangGraphMessagesEvent<TMessage> = {
  event:
    | "messages"
    | "messages/partial"
    | "messages/complete"
    | "metadata"
    | "updates"
    | string;
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
      newMessages = newMessages.map((m) => (m.id ? m : { ...m, id: uuidv4() }));

      const accumulator = new LangGraphMessageAccumulator({
        initialMessages: messages,
        appendMessage,
      });
      setMessages(accumulator.addMessages(newMessages));

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const response = await stream(newMessages, {
        ...config,
        abortSignal: abortController.signal,
      });

      for await (const chunk of response) {
        if (
          chunk.event === "messages/partial" ||
          chunk.event === "messages/complete"
        ) {
          setMessages(accumulator.addMessages(chunk.data));
        } else if (chunk.event === "updates") {
          setInterrupt(chunk.data.__interrupt__?.[0]);
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
