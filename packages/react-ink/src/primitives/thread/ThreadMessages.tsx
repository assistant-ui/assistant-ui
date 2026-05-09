import {
  type ComponentType,
  type FC,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { Box, Static } from "ink";
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
 * `windowSize + windowOverscan` messages are kept in the live render region.
 * Messages above the window are emitted exactly once through Ink's `<Static>`
 * — Ink writes them to stdout, the terminal commits them to scrollback, and
 * the React subtree is then unmounted. As new messages arrive, older entries
 * graduate from the live tail into `<Static>` automatically.
 *
 * Trade-off: messages that have graduated into `<Static>` are read-only from
 * the renderer's perspective. Edits to messages outside the window won't
 * repaint until the user re-opens the thread. This matches terminal
 * scrollback semantics — scrolled-past output is committed history.
 *
 * Defaults to no windowing for backward compatibility.
 */
type WindowingProps = {
  /**
   * Maximum number of recent messages to keep in the live render region.
   * When unset, all messages render dynamically (legacy behavior).
   */
  windowSize?: number | undefined;
  /**
   * Extra messages above the window kept in the live region to absorb
   * remount churn at the boundary during streaming. Defaults to 4.
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

  // [tailStart, messagesLength) is the live region; [0, tailStart) is the
  // committed prefix rendered through <Static>. With no windowing, tailStart
  // is 0 — all messages stay live (legacy behavior).
  const tailStart =
    windowSize !== undefined
      ? Math.max(0, messagesLength - windowSize - windowOverscan)
      : 0;

  // <Static> only renders newly-added items: it reads `items.slice(committed)`
  // each render and bumps the committed cursor in a layout effect. Identity-
  // stable indices let the slice short-circuit cleanly when the array grows.
  const prefixIndices = useMemo(
    () => Array.from({ length: tailStart }, (_, i) => i),
    [tailStart],
  );

  const tail = useMemo(() => {
    if (messagesLength === 0) return null;
    const items: ReactNode[] = [];
    for (let index = tailStart; index < messagesLength; index++) {
      items.push(<MemoMessage key={index} index={index} render={children} />);
    }
    return items;
  }, [messagesLength, tailStart, children]);

  if (tailStart === 0) return tail;

  return (
    <>
      <Static items={prefixIndices}>
        {(index) => <MemoMessage key={index} index={index} render={children} />}
      </Static>
      {tail}
    </>
  );
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({
  components,
  children,
  windowSize,
  windowOverscan,
}) => {
  // Field-level destructure so inline `components={{ Message: MyMessage }}`
  // doesn't bust the memo on every parent render. As long as the individual
  // component refs are stable, `stableComponents` keeps a stable identity
  // and `MemoMessage` can short-circuit unchanged subtrees.
  const Message = components?.Message;
  const EditComposer = components?.EditComposer;
  const UserEditComposer = components?.UserEditComposer;
  const AssistantEditComposer = components?.AssistantEditComposer;
  const SystemEditComposer = components?.SystemEditComposer;
  const UserMessage = components?.UserMessage;
  const AssistantMessage = components?.AssistantMessage;
  const SystemMessage = components?.SystemMessage;

  const stableComponents = useMemo<MessageComponents | undefined>(() => {
    if (!components) return undefined;
    return {
      Message,
      EditComposer,
      UserEditComposer,
      AssistantEditComposer,
      SystemEditComposer,
      UserMessage,
      AssistantMessage,
      SystemMessage,
    } as MessageComponents;
  }, [
    components,
    Message,
    EditComposer,
    UserEditComposer,
    AssistantEditComposer,
    SystemEditComposer,
    UserMessage,
    AssistantMessage,
    SystemMessage,
  ]);

  const renderFromComponents = useCallback(
    () =>
      stableComponents ? (
        <ThreadMessageComponent components={stableComponents} />
      ) : null,
    [stableComponents],
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
