import { useState, useCallback } from "react";
import { INTERNAL } from "@assistant-ui/react";

const { generateId } = INTERNAL;

export const useLangGraphMessages = <TMessage>({
  stream,
}: {
  stream: (messages: TMessage[]) => Promise<
    AsyncGenerator<{
      event: string;
      data: any;
    }>
  >;
}) => {
  const [messages, setMessages] = useState<TMessage[]>([]);

  const sendMessage = useCallback(
    async (newMessages: TMessage[]) => {
      const optimisticMessages = [...messages, ...newMessages];
      if (newMessages.length > 0) {
        setMessages(optimisticMessages);
      }

      const response = await stream(newMessages);

      const completeMessages: TMessage[] = [];
      let partialMessages: Map<string, TMessage> = new Map();
      for await (const chunk of response) {
        if (chunk.event === "messages/partial") {
          // bug fix: messages/complete is not sent for some python langchain backends
          if (completeMessages.length === 0) {
            completeMessages.push(...optimisticMessages);
          }

          for (const message of chunk.data) {
            if (!message.id) throw new Error("Partial message missing id");

            partialMessages.set(message.id, message);
          }
        } else if (chunk.event === "messages/complete") {
          for (const message of chunk.data) {
            if (message.id) {
              partialMessages.delete(message.id);
            }

            // bug fix: tool results can arrive before the message is complete ?
            // if we have partial messages left, we add complete message to partial messages
            if (partialMessages.size > 0) {
              partialMessages.set(message.id ?? generateId(), message);
            } else {
              completeMessages.push(message);
            }
          }
        } else {
          continue;
        }

        setMessages([...completeMessages, ...partialMessages.values()]);
      }
      // if (partialMessages.size > 0) {
      //   throw new Error("A partial message was not marked as complete");
      // }
    },
    [messages, stream],
  );

  return { messages, sendMessage, setMessages };
};
