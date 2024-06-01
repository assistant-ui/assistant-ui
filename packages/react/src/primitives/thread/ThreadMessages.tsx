"use client";

import type { ComponentType, FC } from "react";
import { useAssistantContext } from "../../utils/context/AssistantContext";
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
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixes a11y issues with branch navigation
          <Provider key={idx} message={message}>
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
