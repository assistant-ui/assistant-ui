import {
  type ComponentType,
  type FC,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { Box } from "ink";
import type { ThreadMessage } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";
import { MemoMessage } from "../internal/MemoMessage";

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

/**
 * Optional virtualization config.
 *
 * Terminals scroll their own backbuffer; rendering messages that have already
 * scrolled past the visible region is wasted work and (during streaming) also
 * wasted store subscriptions. When `windowSize` is set, only the last
 * `windowSize + windowOverscan` messages are mounted. Older messages are
 * unmounted entirely — Ink will continue to display whatever it has already
 * flushed to the terminal scrollback above the live region.
 *
 * Defaults to no windowing for backward compatibility.
 */
type WindowingProps = {
  /**
   * Maximum number of recent messages to keep mounted. When unset, all
   * messages render (legacy behavior).
   */
  windowSize?: number | undefined;
  /**
   * Extra messages above the window kept mounted to avoid remount churn at
   * the boundary during scroll/append. Defaults to 4.
   */
  windowOverscan?: number | undefined;
};

export type ThreadMessagesProps =
  | ({
      components: MessageComponents;
      children?: never;
    } & WindowingProps)
  | ({
      children: (value: { message: ThreadMessage }) => ReactNode;
      components?: never;
    } & WindowingProps);

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
  windowSize?: number | undefined;
  windowOverscan?: number | undefined;
}> = ({ children, windowSize, windowOverscan = 4 }) => {
  const messagesLength = useAuiState((s) => s.thread.messages.length);

  // Compute the [start, end) window. When windowSize is undefined, render all.
  const start =
    windowSize !== undefined
      ? Math.max(0, messagesLength - windowSize - windowOverscan)
      : 0;

  return useMemo(() => {
    if (messagesLength === 0) return null;
    const items: ReactNode[] = [];
    for (let index = start; index < messagesLength; index++) {
      items.push(<MemoMessage key={index} index={index} render={children} />);
    }
    return items;
  }, [messagesLength, start, children]);
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({
  components,
  children,
  windowSize,
  windowOverscan,
}) => {
  // Stable identity for the components-driven render callback so that
  // MemoMessage children below can short-circuit on unchanged inputs.
  const renderFromComponents = useCallback(
    () =>
      components ? <ThreadMessageComponent components={components} /> : null,
    [components],
  );

  if (components) {
    return (
      <Box flexDirection="column">
        <ThreadMessagesInner
          windowSize={windowSize}
          windowOverscan={windowOverscan}
        >
          {renderFromComponents}
        </ThreadMessagesInner>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <ThreadMessagesInner
        windowSize={windowSize}
        windowOverscan={windowOverscan}
      >
        {children}
      </ThreadMessagesInner>
    </Box>
  );
};
