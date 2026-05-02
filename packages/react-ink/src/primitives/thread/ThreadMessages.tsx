import {
  type ComponentType,
  type FC,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Box, useBoxMetrics, type DOMElement } from "ink";
import type { ThreadMessage } from "@assistant-ui/core";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";
import {
  useOptionalThreadViewport,
  type ThreadViewportContextValue,
} from "./useThreadViewport";
import type { ThreadMessageKey } from "./useThreadViewportState";

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
  messageKeys: readonly ThreadMessageKey[];
  estimatedHeights: readonly number[];
  setMessageHeight: ThreadViewportContextValue["setMessageHeight"] | undefined;
}> = ({ children, messageKeys, estimatedHeights, setMessageHeight }) => {
  const messagesLength = useAuiState((s) => s.thread.messages.length);

  return useMemo(() => {
    if (messagesLength === 0) return null;
    return Array.from({ length: messagesLength }, (_, index) => (
      <MeasuredThreadMessage
        key={String(messageKeys[index] ?? index)}
        messageKey={messageKeys[index] ?? index}
        estimatedHeight={estimatedHeights[index] ?? 1}
        setMessageHeight={setMessageHeight}
      >
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
      </MeasuredThreadMessage>
    ));
  }, [
    messagesLength,
    messageKeys,
    estimatedHeights,
    setMessageHeight,
    children,
  ]);
};

const getMessageKey = (message: ThreadMessage, index: number) =>
  message.id ?? index;

const getTextHeightEstimate = (message: ThreadMessage, width: number) => {
  const text = message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (!text) return 1;

  const contentWidth = Math.max(20, width - 4);
  const textRows = text
    .split("\n")
    .reduce(
      (rows, line) => rows + Math.max(1, Math.ceil(line.length / contentWidth)),
      0,
    );

  return textRows + (message.role === "assistant" ? 2 : 1);
};

const MeasuredThreadMessage: FC<{
  messageKey: ThreadMessageKey;
  estimatedHeight: number;
  setMessageHeight: ThreadViewportContextValue["setMessageHeight"] | undefined;
  children: ReactNode;
}> = ({ messageKey, estimatedHeight, setMessageHeight, children }) => {
  const ref = useRef<DOMElement>(null!);
  const { height, hasMeasured } = useBoxMetrics(ref);

  useLayoutEffect(() => {
    if (!setMessageHeight || !hasMeasured) return;
    setMessageHeight(messageKey, Math.max(height, estimatedHeight));
  }, [estimatedHeight, height, hasMeasured, messageKey, setMessageHeight]);

  if (!setMessageHeight) return <>{children}</>;

  return (
    <Box ref={ref} flexShrink={0}>
      {children}
    </Box>
  );
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({
  components,
  children,
}) => {
  const viewport = useOptionalThreadViewport();
  const setMessageKeys = viewport?.setMessageKeys;
  const setMessageHeight = viewport?.setMessageHeight;
  const viewportWidth = viewport?.viewportWidth;
  const scrollOffset = viewport?.state.scrollOffset;
  const messages = useAuiState((s) => s.thread.messages);
  const messageKeys = useMemo(
    () => messages.map((message, index) => getMessageKey(message, index)),
    [messages],
  );

  useLayoutEffect(() => {
    setMessageKeys?.(messageKeys);
  }, [messageKeys, setMessageKeys]);

  const estimatedHeights = useMemo(
    () =>
      messages.map((message) =>
        getTextHeightEstimate(message, viewportWidth ?? 80),
      ),
    [messages, viewportWidth],
  );
  const renderMessage = components
    ? () => <ThreadMessageComponent components={components} />
    : children;

  const content = (
    <ThreadMessagesInner
      messageKeys={messageKeys}
      estimatedHeights={estimatedHeights}
      setMessageHeight={setMessageHeight}
    >
      {renderMessage}
    </ThreadMessagesInner>
  );

  const marginTop = scrollOffset !== undefined ? -scrollOffset : undefined;

  return (
    <Box flexDirection="column" marginTop={marginTop} flexShrink={0}>
      {content}
    </Box>
  );
};
