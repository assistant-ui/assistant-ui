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
        SystemMessage?: ComponentType | undefined;
      }
    | {
        Message?: ComponentType | undefined;
        UserMessage: ComponentType;
        EditComposer?: ComponentType | undefined;
        AssistantMessage: ComponentType;
        SystemMessage?: ComponentType | undefined;
      };
};

const DEFAULT_SYSTEM_MESSAGE = () => null;

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
    SystemMessage: components.SystemMessage ?? DEFAULT_SYSTEM_MESSAGE,
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
  const { UserMessage, EditComposer, AssistantMessage, SystemMessage } =
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
      <MessagePrimitiveIf system>
        <SystemMessage />
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
    prev.components.AssistantMessage === next.components.AssistantMessage &&
    prev.components.SystemMessage === next.components.SystemMessage,
);

export const ThreadPrimitiveMessagesImpl: FC<ThreadPrimitiveMessagesProps> = ({
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

ThreadPrimitiveMessagesImpl.displayName = "ThreadPrimitive.Messages";

export const ThreadPrimitiveMessages = memo(
  ThreadPrimitiveMessagesImpl,
  (prev, next) =>
    prev.components?.Message === next.components?.Message &&
    prev.components?.UserMessage === next.components?.UserMessage &&
    prev.components?.EditComposer === next.components?.EditComposer &&
    prev.components?.AssistantMessage === next.components?.AssistantMessage &&
    prev.components?.SystemMessage === next.components?.SystemMessage,
);
