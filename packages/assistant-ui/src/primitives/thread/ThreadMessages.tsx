"use client";

import { FC } from "react";
import { Provider } from "../message";
import { useThreadContext } from "../../utils/context/Context";

type ThreadMessagesProps = {
  components: {
    Message: React.ComponentType<{}>;
  };
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({
  components: { Message },
}) => {
  const chat = useThreadContext();
  const messages = chat.messages;

  if (messages.length === 0) return null;

  return (
    <>
      {messages.map((message, index) => {
        return (
          <Provider key={index} message={message}>
            <Message />
          </Provider>
        );
      })}
      {chat.isLoading &&
        chat.messages[chat.messages.length - 1].role !== "assistant" && (
          <Provider message={{ id: "", role: "assistant", content: "..." }}>
            <Message />
          </Provider>
        )}
    </>
  );
};
