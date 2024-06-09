"use client";

import type { ComponentType, FC } from "react";
import { useAssistantContext } from "../../context/AssistantContext";
import { ComposerIf } from "../composer/ComposerIf";
import { Provider } from "../message";
import { MessageIf } from "../message/MessageIf";

type ThreadMessagesProps = {
  components:
    | {
        Message: ComponentType;
        UserMessage?: ComponentType;
        EditComposer?: ComponentType;
        AssistantMessage?: ComponentType;
      }
    | {
        Message?: ComponentType;
        UserMessage: ComponentType;
        EditComposer?: ComponentType;
        AssistantMessage: ComponentType;
      };
};

const getComponents = (components: ThreadMessagesProps["components"]) => {
  return {
    EditComposer:
      components.EditComposer ??
      components.UserMessage ??
      (components.Message as ComponentType),
    UserMessage:
      components.UserMessage ?? (components.Message as ComponentType),
    AssistantMessage:
      components.AssistantMessage ?? (components.Message as ComponentType),
  };
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({ components }) => {
  const { useThread } = useAssistantContext();
  const thread = useThread();

  const messages = thread.messages;

  const { UserMessage, EditComposer, AssistantMessage } =
    getComponents(components);

  if (messages.length === 0) return null;

  return (
    <>
      {messages.map((message, idx) => {
        const parentId = messages[idx - 1]?.id ?? null;
        return (
          <Provider
            key={parentId ?? "__ROOT__"} // keep the same key when switching branches for better a11y support
            message={message}
            parentId={parentId}
          >
            <MessageIf user>
              <ComposerIf editing={false}>
                <UserMessage />
              </ComposerIf>
              <ComposerIf editing>
                <EditComposer />
              </ComposerIf>
            </MessageIf>
            <MessageIf assistant>
              <AssistantMessage />
            </MessageIf>
          </Provider>
        );
      })}
    </>
  );
};
