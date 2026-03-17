import { type ComponentType, type FC, type ReactNode, useMemo } from "react";
import { Box } from "ink";
import type { ThreadMessage } from "@assistant-ui/core";
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

export type ThreadMessagesProps =
  | {
      components: MessageComponents;
      children?: never;
    }
  | {
      children: (value: { message: ThreadMessage }) => ReactNode;
      components?: never;
    };

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
          (components.Message as ComponentType) ??
          DEFAULT_SYSTEM_MESSAGE
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

const ThreadMessagesInner: FC<{
  children: (value: { message: ThreadMessage }) => ReactNode;
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

export const ThreadMessages: FC<ThreadMessagesProps> = ({
  components,
  children,
}) => {
  if (components) {
    return (
      <Box flexDirection="column">
        <ThreadMessagesInner>
          {() => <ThreadMessageComponent components={components} />}
        </ThreadMessagesInner>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <ThreadMessagesInner>{children}</ThreadMessagesInner>
    </Box>
  );
};
