"use client";

import type { FC } from "react";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { UPCOMING_MESSAGE_ID } from "../../utils/hooks/useBranches";
import { Provider } from "../message";

type ThreadMessagesProps = {
  components:
    | {
        Message: React.ComponentType;
      }
    | {
        UserMessage: React.ComponentType;
        AssistantMessage: React.ComponentType;
      };
};

const getComponents = (components: ThreadMessagesProps["components"]) => {
  if ("Message" in components) {
    return {
      UserMessage: components.Message,
      AssistantMessage: components.Message,
    };
  }

  return components;
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({ components }) => {
  const chat = useThreadContext("Thread.Messages", (s) => s.chat);
  const messages = chat.messages;

  const { UserMessage, AssistantMessage } = getComponents(components);

  if (messages.length === 0) return null;

  return (
    <>
      {messages.map((message) => {
        return (
          <Provider key={message.id} message={message}>
            {message.role === "assistant" ? (
              <AssistantMessage />
            ) : (
              <UserMessage />
            )}
          </Provider>
        );
      })}
      {chat.isLoading &&
        chat.messages[chat.messages.length - 1]?.role !== "assistant" && (
          <Provider
            message={{
              id: UPCOMING_MESSAGE_ID,
              role: "assistant",
              content: "...",
            }}
          >
            <AssistantMessage />
          </Provider>
        )}
    </>
  );
};
