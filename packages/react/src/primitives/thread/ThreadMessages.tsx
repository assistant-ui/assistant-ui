"use client";

import type { FC } from "react";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { UPCOMING_MESSAGE_ID } from "../../utils/hooks/useBranches";
import { hasUpcomingMessage } from "../../utils/hooks/useBranches";
import { Provider } from "../message";
import { MessageIf } from "../message/MessageIf";

type ThreadMessagesProps = {
  components:
    | {
        Message: React.ComponentType;
        UserMessage?: React.ComponentType;
        EditingUserMessage?: React.ComponentType;
        AssistantMessage?: React.ComponentType;
      }
    | {
        Message?: React.ComponentType;
        UserMessage: React.ComponentType;
        EditingUserMessage?: React.ComponentType;
        AssistantMessage: React.ComponentType;
      };
};

const getComponents = (components: ThreadMessagesProps["components"]) => {
  return {
    EditingUserMessage:
      components.EditingUserMessage ??
      components.UserMessage ??
      (components.Message as React.ComponentType),
    UserMessage:
      components.UserMessage ?? (components.Message as React.ComponentType),
    AssistantMessage:
      components.AssistantMessage ??
      (components.Message as React.ComponentType),
  };
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({ components }) => {
  const chat = useThreadContext("Thread.Messages", (s) => s.chat);
  const messages = chat.messages;

  const { UserMessage, EditingUserMessage, AssistantMessage } =
    getComponents(components);

  if (messages.length === 0) return null;

  return (
    <>
      {messages.map((message, idx) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixes a11y issues with branch navigation
          <Provider key={idx} message={message}>
            <MessageIf user editing={false}>
              <UserMessage />
            </MessageIf>
            <MessageIf user editing>
              <EditingUserMessage />
            </MessageIf>
            <MessageIf assistant>
              <AssistantMessage />
            </MessageIf>
          </Provider>
        );
      })}
      {hasUpcomingMessage(chat) && (
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
