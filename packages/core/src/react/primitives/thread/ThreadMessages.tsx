import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { MessageByIndexProvider } from "../../providers/MessageByIndexProvider";
import { MessageState } from "../../../store";

type MessagesComponentConfig =
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

export namespace ThreadPrimitiveMessages {
  export type Props =
    | {
        /** @deprecated Use the children render function instead. */
        components: MessagesComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each message. Receives the message. */
        children: (value: { message: MessageState }) => ReactNode;
        components?: never;
      };
}

const isComponentsSame = (
  prev: MessagesComponentConfig,
  next: MessagesComponentConfig,
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
  components: MessagesComponentConfig,
  role: MessageState["role"],
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
        return (
          components.SystemMessage ??
          (components.Message as ComponentType) ??
          DEFAULT_SYSTEM_MESSAGE
        );
      }
    default: {
      const _exhaustiveCheck: never = role;
      throw new Error(`Unknown message role: ${_exhaustiveCheck}`);
    }
  }
};

type ThreadMessageComponentProps = {
  components: MessagesComponentConfig;
};

const ThreadMessageComponent: FC<ThreadMessageComponentProps> = ({
  components,
}) => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  const Component = getComponent(components, role, isEditing);

  return <Component />;
};
export namespace ThreadPrimitiveMessageByIndex {
  export type Props = {
    index: number;
    components: MessagesComponentConfig;
  };
}

/**
 * Renders a single message at the specified index in the current thread.
 */
export const ThreadPrimitiveMessageByIndex: FC<ThreadPrimitiveMessageByIndex.Props> =
  memo(
    ({ index, components }) => {
      return (
        <MessageByIndexProvider index={index}>
          <ThreadMessageComponent components={components} />
        </MessageByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      isComponentsSame(prev.components, next.components),
  );

ThreadPrimitiveMessageByIndex.displayName = "ThreadPrimitive.MessageByIndex";

const ThreadPrimitiveMessagesInner: FC<{
  children: (value: { message: MessageState }) => ReactNode;
}> = ({ children }) => {
  const messagesLength = useAuiState((s) => s.thread.messages.length);

  return useMemo(() => {
    if (messagesLength === 0) return null;
    return Array.from({ length: messagesLength }, (_, index) => (
      <MessageByIndexProvider key={index} index={index}>
        <RenderChildrenWithAccessor
          getItemState={(aui) => aui.thread().message({ index }).getState()}
        >
          {(getItem) =>
            children({
              get message() {
                return getItem();
              },
            })
          }
        </RenderChildrenWithAccessor>
      </MessageByIndexProvider>
    ));
  }, [messagesLength, children]);
};

/**
 * Renders all messages in the current thread.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Messages>
 *   {({ message }) => {
 *     if (message.role === "user") return <MyUserMessage />;
 *     return <MyAssistantMessage />;
 *   }}
 * </ThreadPrimitive.Messages>
 * ```
 */
export const ThreadPrimitiveMessagesImpl: FC<ThreadPrimitiveMessages.Props> = ({
  components,
  children,
}) => {
  if (components) {
    return (
      <ThreadPrimitiveMessagesInner>
        {() => <ThreadMessageComponent components={components} />}
      </ThreadPrimitiveMessagesInner>
    );
  }
  return (
    <ThreadPrimitiveMessagesInner>{children}</ThreadPrimitiveMessagesInner>
  );
};

ThreadPrimitiveMessagesImpl.displayName = "ThreadPrimitive.Messages";

export const ThreadPrimitiveMessages = memo(
  ThreadPrimitiveMessagesImpl,
  (prev, next) => {
    if (prev.children || next.children) {
      return prev.children === next.children;
    }
    return isComponentsSame(prev.components!, next.components!);
  },
);
