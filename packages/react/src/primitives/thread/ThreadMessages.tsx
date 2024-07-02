"use client";

import { type ComponentType, type FC, memo } from "react";
import { useThreadContext } from "../../context/react/ThreadContext";
import { MessageProvider } from "../../context/providers/MessageProvider";
import { ComposerPrimitiveIf } from "../composer/ComposerIf";
import { MessagePrimitiveIf } from "../message/MessageIf";

export type ThreadPrimitiveMessagesProps = {
  components:
    | {
        Message: ComponentType;
        UserMessage?: ComponentType | undefined;
        EditComposer?: ComponentType | undefined;
        AssistantMessage?: ComponentType | undefined;
      }
    | {
        Message?: ComponentType | undefined;
        UserMessage: ComponentType;
        EditComposer?: ComponentType | undefined;
        AssistantMessage: ComponentType;
      };
};

const getComponents = (
  components: ThreadPrimitiveMessagesProps["components"],
) => {
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
  components: ThreadPrimitiveMessagesProps["components"];
};

const ThreadMessageImpl: FC<ThreadMessageProps> = ({
  messageIndex,
  components,
}) => {
  const { UserMessage, EditComposer, AssistantMessage } =
    getComponents(components);
  return (
    <MessageProvider messageIndex={messageIndex}>
      <MessagePrimitiveIf user>
        <ComposerPrimitiveIf editing={false}>
          <UserMessage />
        </ComposerPrimitiveIf>
        <ComposerPrimitiveIf editing>
          <EditComposer />
        </ComposerPrimitiveIf>
      </MessagePrimitiveIf>
      <MessagePrimitiveIf assistant>
        <AssistantMessage />
      </MessagePrimitiveIf>
    </MessageProvider>
  );
};

const ThreadMessage = memo(
  ThreadMessageImpl,
  (prev, next) =>
    prev.messageIndex === next.messageIndex &&
    prev.components.Message === next.components.Message &&
    prev.components.UserMessage === next.components.UserMessage &&
    prev.components.EditComposer === next.components.EditComposer &&
    prev.components.AssistantMessage === next.components.AssistantMessage,
);

export const ThreadPrimitiveMessages: FC<ThreadPrimitiveMessagesProps> = ({
  components,
}) => {
  const { useThreadMessages } = useThreadContext();

  const messagesLength = useThreadMessages((t) => t.length);
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

ThreadPrimitiveMessages.displayName = "ThreadPrimitive.Messages";
