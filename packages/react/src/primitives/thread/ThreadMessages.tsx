"use client";

import { type ComponentType, type FC, memo, useMemo } from "react";
import { useAssistantState, MessageByIndexProvider } from "../../context";
import { ThreadMessage as ThreadMessageType } from "../../types";
import { useRegisterLastUserMessageScrollAnchor } from "./ThreadViewportAnchorContext";

export namespace ThreadPrimitiveMessages {
  export type Props = {
    /**
     * Component configuration for rendering different types of messages and composers.
     *
     * You can provide either:
     * 1. A single `Message` component that handles all message types
     * 2. Specific components for `UserMessage` and `AssistantMessage` (with optional `SystemMessage`)
     *
     * Optional edit composer components can be provided to customize the editing experience
     * for different message types when users edit their messages.
     */
    components:
      | {
          /** Component used to render all message types */
          Message: ComponentType;
          /** Component used when editing any message type */
          EditComposer?: ComponentType | undefined;
          /** Component used when editing user messages specifically */
          UserEditComposer?: ComponentType | undefined;
          /** Component used when editing assistant messages specifically */
          AssistantEditComposer?: ComponentType | undefined;
          /** Component used when editing system messages specifically */
          SystemEditComposer?: ComponentType | undefined;
          /** Component used to render user messages specifically */
          UserMessage?: ComponentType | undefined;
          /** Component used to render assistant messages specifically */
          AssistantMessage?: ComponentType | undefined;
          /** Component used to render system messages specifically */
          SystemMessage?: ComponentType | undefined;
        }
      | {
          /** Component used to render all message types (fallback) */
          Message?: ComponentType | undefined;
          /** Component used when editing any message type */
          EditComposer?: ComponentType | undefined;
          /** Component used when editing user messages specifically */
          UserEditComposer?: ComponentType | undefined;
          /** Component used when editing assistant messages specifically */
          AssistantEditComposer?: ComponentType | undefined;
          /** Component used when editing system messages specifically */
          SystemEditComposer?: ComponentType | undefined;
          /** Component used to render user messages */
          UserMessage: ComponentType;
          /** Component used to render assistant messages */
          AssistantMessage: ComponentType;
          /** Component used to render system messages */
          SystemMessage?: ComponentType | undefined;
        };
  };
}

const isComponentsSame = (
  prev: ThreadPrimitiveMessages.Props["components"],
  next: ThreadPrimitiveMessages.Props["components"],
) => {
  return (
    prev.Message === next.Message &&
    prev.EditComposer === next.EditComposer &&
    prev.UserEditComposer === next.UserEditComposer &&
    prev.AssistantEditComposer === next.AssistantEditComposer &&
    prev.SystemEditComposer === next.SystemEditComposer &&
    prev.UserMessage === next.UserMessage &&
    prev.AssistantMessage === next.AssistantMessage &&
    prev.SystemMessage === next.SystemMessage
  );
};

const DEFAULT_SYSTEM_MESSAGE = () => null;

const getComponent = (
  components: ThreadPrimitiveMessages.Props["components"],
  role: ThreadMessageType["role"],
  isEditing: boolean,
) => {
  switch (role) {
    case "user":
      if (isEditing) {
        return (
          components.UserEditComposer ??
          components.EditComposer ??
          components.UserMessage ??
          (components.Message as ComponentType)
        );
      } else {
        return components.UserMessage ?? (components.Message as ComponentType);
      }
    case "assistant":
      if (isEditing) {
        return (
          components.AssistantEditComposer ??
          components.EditComposer ??
          components.AssistantMessage ??
          (components.Message as ComponentType)
        );
      } else {
        return (
          components.AssistantMessage ?? (components.Message as ComponentType)
        );
      }
    case "system":
      if (isEditing) {
        return (
          components.SystemEditComposer ??
          components.EditComposer ??
          components.SystemMessage ??
          (components.Message as ComponentType)
        );
      } else {
        return components.SystemMessage ?? DEFAULT_SYSTEM_MESSAGE;
      }
    default:
      const _exhaustiveCheck: never = role;
      throw new Error(`Unknown message role: ${_exhaustiveCheck}`);
  }
};

type ThreadMessageComponentProps = {
  components: ThreadPrimitiveMessages.Props["components"];
};

const ThreadMessageComponent: FC<ThreadMessageComponentProps> = ({
  components,
}) => {
  const role = useAssistantState(({ message }) => message.role);
  const isEditing = useAssistantState(
    ({ message }) => message.composer.isEditing,
  );
  const Component = getComponent(components, role, isEditing);

  return <Component />;
};
export namespace ThreadPrimitiveMessageByIndex {
  export type Props = {
    index: number;
    components: ThreadPrimitiveMessages.Props["components"];
    lastUserMessageId: string | undefined;
  };
}

const LastUserMessageAnchor: FC<{ lastUserMessageId: string | undefined }> = ({
  lastUserMessageId,
}) => {
  const isLastUserMessage = useAssistantState(
    ({ message }) =>
      message.role === "user" && message.id === lastUserMessageId,
  );
  const registerLastUserMessageScrollAnchor =
    useRegisterLastUserMessageScrollAnchor();

  if (!isLastUserMessage) return null;

  return (
    <span
      ref={registerLastUserMessageScrollAnchor}
      aria-hidden="true"
      className="aui-thread-last-user-message-anchor block h-0 overflow-hidden"
    />
  );
};

/**
 * Renders a single message at the specified index in the current thread.
 *
 * This component provides message context for a specific message in the thread
 * and renders it using the provided component configuration.
 *
 * @note The ThreadMessageComponent is wrapped in a div so the viewport can
 * auto-scroll to the last user message without the message component opting in.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.MessageByIndex
 *   index={0}
 *   components={{
 *     UserMessage: MyUserMessage,
 *     AssistantMessage: MyAssistantMessage
 *   }}
 * />
 * ```
 */
export const ThreadPrimitiveMessageByIndex: FC<ThreadPrimitiveMessageByIndex.Props> =
  memo(
    ({ index, components, lastUserMessageId }) => {
      return (
        <MessageByIndexProvider index={index}>
          <ThreadMessageComponent components={components} />
          <LastUserMessageAnchor lastUserMessageId={lastUserMessageId} />
        </MessageByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.lastUserMessageId === next.lastUserMessageId &&
      isComponentsSame(prev.components, next.components),
  );

ThreadPrimitiveMessageByIndex.displayName = "ThreadPrimitive.MessageByIndex";

/**
 * Renders all messages in the current thread using the provided component configuration.
 *
 * This component automatically renders all messages in the thread, providing the appropriate
 * message context for each message. It handles different message types (user, assistant, system)
 * and supports editing mode through the provided edit composer components.
 *
 * The auto-scroll to the last user message behavior relies on the built-in anchor rendered by
 * this component. If you render a custom message list, add an equivalent anchor so auto-scroll stays intact.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Messages
 *   components={{
 *     UserMessage: MyUserMessage,
 *     AssistantMessage: MyAssistantMessage,
 *     EditComposer: MyEditComposer
 *   }}
 * />
 * ```
 */
export const ThreadPrimitiveMessagesImpl: FC<ThreadPrimitiveMessages.Props> = ({
  components,
}) => {
  const threadState = useAssistantState(({ thread }) => thread);
  const messagesLength = threadState.messages.length;

  let lastUserMessageId: string | undefined;

  for (let i = threadState.messages.length - 1; i >= 0; i -= 1) {
    const candidate = threadState.messages[i];
    if (candidate?.role === "user") {
      lastUserMessageId = candidate.id;
      break;
    }
  }

  const messageElements = useMemo(() => {
    if (messagesLength === 0) return null;
    return Array.from({ length: messagesLength }, (_, index) => (
      <ThreadPrimitiveMessageByIndex
        key={index}
        index={index}
        components={components}
        lastUserMessageId={lastUserMessageId}
      />
    ));
  }, [messagesLength, components, lastUserMessageId]);

  return messageElements;
};

ThreadPrimitiveMessagesImpl.displayName = "ThreadPrimitive.Messages";

export const ThreadPrimitiveMessages = memo(
  ThreadPrimitiveMessagesImpl,
  (prev, next) => isComponentsSame(prev.components, next.components),
);
