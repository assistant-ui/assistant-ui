import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

export type LangGraphCommand = {
  resume: string;
};

export type LangGraphSendMessageConfig = {
  command?: LangGraphCommand;
  runConfig?: unknown;
};

type LangGraphMessagesEvent<TMessage> = {
  event:
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
  value: any;
  resumable: boolean;
  when: string;
  ns: string[];
};

export const useLangGraphMessages = <TMessage extends { id?: string }>({
  stream,
}: {
  stream: LangGraphStreamCallback<TMessage>;
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

      const messagesMap = new Map<string, TMessage>();
      const addMessages = (newMessages: TMessage[]) => {
        if (newMessages.length === 0) return;
        for (const message of newMessages) {
          messagesMap.set(message.id ?? uuidv4(), message);
        }
        setMessages([...messagesMap.values()]);
      };
      addMessages([...messages, ...newMessages]);

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
          addMessages(chunk.data);
        } else if (chunk.event === "updates") {
          setInterrupt(chunk.data.__interrupt__);
        }
      }
    },
    [messages, stream],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [abortControllerRef]);

  return { interrupt, messages, sendMessage, cancel, setMessages };
};
