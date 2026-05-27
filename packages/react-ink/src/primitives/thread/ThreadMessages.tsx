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
 * Live render region keeps the last `windowSize + windowOverscan` messages;
 * older messages graduate through Ink's `<Static>` into terminal scrollback
 * and stop repainting. Defaults to no windowing.
 *
 * Per-message memoization only engages when the render callback is
 * referentially stable. The `components` API handles stability internally;
 * with the children render-fn API, hoist or memoize the function.
 */
type WindowingProps = {
  /** Recent messages kept live. Unset renders all dynamically. Negative clamped to 0. */
  windowSize?: number | undefined;
  /** Extra live messages above the window to absorb boundary churn. Defaults to 4. Negative clamped to 0. */
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

  const tailStart =
    windowSize !== undefined
      ? Math.max(
          0,
          messagesLength -
            Math.max(0, windowSize) -
            Math.max(0, windowOverscan),
        )
      : 0;

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
    // oxlint-disable-next-line tap-hooks/exhaustive-deps -- per-field deps cover real changes; including `components` would bust the memo on inline literal props
  }, [
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
