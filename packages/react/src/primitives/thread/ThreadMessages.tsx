"use client";

import type { ComponentType, FC } from "react";
import { useThreadContext } from "../../context/ThreadContext";
import { MessageProvider } from "../../context/providers/MessageProvider";
import { ComposerIf } from "../composer/ComposerIf";
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
  const { useThread } = useThreadContext();
  const messagesLength = useThread((t) => t.messages.length);

  const { UserMessage, EditComposer, AssistantMessage } =
    getComponents(components);

  if (messagesLength === 0) return null;

  return (
    <>
      {new Array(messagesLength).fill(null).map((_, idx) => {
        const messageIndex = idx;
        // TODO avoid rerendering on messageLength change
        return (
          <MessageProvider
            key={messageIndex} // keep the same key when switching branches for better a11y support
            messageIndex={messageIndex}
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
          </MessageProvider>
        );
      })}
    </>
  );
};
