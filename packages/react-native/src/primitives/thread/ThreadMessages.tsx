import {
  type ComponentType,
  type FC,
  type ReactNode,
  forwardRef,
  memo,
  useCallback,
} from "react";
import { FlatList, type FlatListProps } from "react-native";
import type { MessageState, ThreadMessage } from "@assistant-ui/core";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";

type MessageComponents =
  | {
      Message: ComponentType;
      EditComposer?: ComponentType | undefined;
      UserEditComposer?: ComponentType | undefined;
      AssistantEditComposer?: ComponentType | undefined;
      SystemEditComposer?: ComponentType | undefined;
      UserMessage?: ComponentType | undefined;
      AssistantMessage?: ComponentType | undefined;
      SystemMessage?: ComponentType | undefined;
    }
  | {
      Message?: ComponentType | undefined;
      EditComposer?: ComponentType | undefined;
      UserEditComposer?: ComponentType | undefined;
      AssistantEditComposer?: ComponentType | undefined;
      SystemEditComposer?: ComponentType | undefined;
      UserMessage: ComponentType;
      AssistantMessage: ComponentType;
      SystemMessage?: ComponentType | undefined;
    };

type MessagesContent =
  | {
      /** @deprecated Use the children render function instead. */
      components: MessageComponents;
      children?: never;
    }
  | {
      children: (value: { message: MessageState }) => ReactNode;
      components?: never;
    };

export type ThreadMessagesProps = Omit<
  FlatListProps<ThreadMessage>,
  "data" | "renderItem" | "children"
> &
  MessagesContent;

const DEFAULT_SYSTEM_MESSAGE = () => null;

const getComponent = (
  components: MessageComponents,
  role: ThreadMessage["role"],
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

const ThreadMessageComponent: FC<{ components: MessageComponents }> = ({
  components,
}) => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  const Component = getComponent(components, role, isEditing);

  return <Component />;
};

const ThreadMessageByIndex = memo(
  ({ index, components }: { index: number; components: MessageComponents }) => {
    return (
      <MessageByIndexProvider index={index}>
        <ThreadMessageComponent components={components} />
      </MessageByIndexProvider>
    );
  },
  (prev, next) =>
    prev.index === next.index && prev.components === next.components,
);
ThreadMessageByIndex.displayName = "ThreadPrimitive.MessageByIndex";

const ThreadMessageByChildren = memo(
  ({
    index,
    children,
  }: {
    index: number;
    children: (value: { message: MessageState }) => ReactNode;
  }) => {
    return (
      <MessageByIndexProvider index={index}>
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
    );
  },
  (prev, next) => prev.index === next.index && prev.children === next.children,
);
ThreadMessageByChildren.displayName = "ThreadPrimitive.MessageByChildren";

export const ThreadMessages = forwardRef<
  FlatList<ThreadMessage>,
  ThreadMessagesProps
>(({ components, children, ...flatListProps }, ref) => {
  const messages = useAuiState((s) => s.thread.messages);

  const renderItem = useCallback(
    ({ index }: { item: ThreadMessage; index: number }) => {
      if (children) {
        return (
          <ThreadMessageByChildren index={index}>
            {children}
          </ThreadMessageByChildren>
        );
      }
      return <ThreadMessageByIndex index={index} components={components!} />;
    },
    [components, children],
  );

  const keyExtractor = useCallback((item: ThreadMessage) => item.id, []);

  return (
    <FlatList
      ref={ref}
      data={messages as unknown as ThreadMessage[]}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      {...flatListProps}
    />
  );
});
ThreadMessages.displayName = "ThreadPrimitive.Messages";
