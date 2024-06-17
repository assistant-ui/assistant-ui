"use client";

import { type ComponentType, type FC, memo } from "react";
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

type ThreadMessageProps = {
  messageIndex: number;
  components: ThreadMessagesProps["components"];
};

const ThreadMessageImpl: FC<ThreadMessageProps> = ({
  messageIndex,
  components,
}) => {
  const { UserMessage, EditComposer, AssistantMessage } =
    getComponents(components);
  return (
    <MessageProvider messageIndex={messageIndex}>
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
};

const ThreadMessage = memo(
  ThreadMessageImpl,
  (prev, next) =>
    prev.messageIndex === next.messageIndex &&
    prev.components.UserMessage === next.components.UserMessage &&
    prev.components.EditComposer === next.components.EditComposer &&
    prev.components.AssistantMessage === next.components.AssistantMessage,
);

export const ThreadMessages: FC<ThreadMessagesProps> = ({ components }) => {
  const { useThread } = useThreadContext();

  const messagesLength = useThread((t) => t.messages.length);
  if (messagesLength === 0) return null;

  return new Array(messagesLength).fill(null).map((_, idx) => {
    const messageIndex = idx; // keep the same key when switching branches for better a11y support
    return (
      <ThreadMessage
        key={messageIndex}
        messageIndex={messageIndex}
        components={components}
      />
    );
  });
};
