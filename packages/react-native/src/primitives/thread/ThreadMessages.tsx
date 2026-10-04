import {
  type ComponentType,
  type FC,
  type ReactNode,
  forwardRef,
  memo,
  useCallback,
} from "react";
import {
  FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { ThreadMessage } from "@assistant-ui/core";
import type { MessageState } from "@assistant-ui/core/store";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";
import {
  useComposedFlatListRef,
  useFlatListAutoScroll,
  useHistoryLoad,
  useThreadHistory,
} from "./flatListScroll";

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

export type ThreadMessagesFlatListProps = Omit<
  FlatListProps<ThreadMessage>,
  "data" | "renderItem" | "children"
> &
  MessagesContent & {
    autoScroll?: boolean | undefined;
    scrollToBottomOnRunStart?: boolean | undefined;
    scrollToBottomOnInitialize?: boolean | undefined;
    scrollToBottomOnThreadSwitch?: boolean | undefined;
    /**
     * Pages older messages in when the list nears its start. Defaults to the
     * runtime's `thread.hasEarlier` / `isLoadingEarlier` / `loadEarlier()`;
     * pass it to drive paging from app state instead.
     */
    history?:
      | {
          hasMore: boolean;
          isLoadingMore: boolean;
          loadMore: () => void;
        }
      | undefined;
  };

/** @deprecated Use ThreadMessagesFlatListProps instead. */
export type ThreadMessagesProps = ThreadMessagesFlatListProps;

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
          getItemState={(aui) => aui.thread.message({ index }).getState()}
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

export const ThreadMessagesFlatList = forwardRef<
  FlatList<ThreadMessage>,
  ThreadMessagesFlatListProps
>(
  (
    {
      autoScroll,
      components,
      children,
      onContentSizeChange,
      onLayout,
      onScroll,
      onStartReached,
      onStartReachedThreshold,
      scrollEventThrottle,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
      history,
      ...flatListProps
    },
    forwardedRef,
  ) => {
    const messages = useAuiState((s) => s.thread.messages);
    const effectiveHistory = useThreadHistory(history);
    const [flatListRef, setFlatListRef] = useComposedFlatListRef(forwardedRef);
    const {
      handleContentSizeChange: handleAutoScrollContentSizeChange,
      handleLayout: handleAutoScrollLayout,
      handleScroll: handleAutoScrollScroll,
    } = useFlatListAutoScroll({
      flatListRef,
      hasMessages: messages.length > 0,
      horizontal: flatListProps.horizontal,
      autoScroll,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
    });

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

    const scrollTracking =
      (autoScroll ?? true) ||
      (scrollToBottomOnInitialize ?? true) ||
      (scrollToBottomOnRunStart ?? true) ||
      (scrollToBottomOnThreadSwitch ?? true);

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        handleAutoScrollLayout(event);
        onLayout?.(event);
      },
      [handleAutoScrollLayout, onLayout],
    );

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        handleAutoScrollScroll(event);
        onScroll?.(event);
      },
      [handleAutoScrollScroll, onScroll],
    );

    const handleContentSizeChange = useCallback(
      (width: number, height: number) => {
        handleAutoScrollContentSizeChange(width, height);
        onContentSizeChange?.(width, height);
      },
      [handleAutoScrollContentSizeChange, onContentSizeChange],
    );

    const { canLoadMore, handleReached } = useHistoryLoad(
      effectiveHistory,
      onStartReached,
    );

    return (
      <FlatList
        ref={setFlatListRef}
        data={messages as unknown as ThreadMessage[]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        {...(scrollTracking
          ? {
              onContentSizeChange: handleContentSizeChange,
              onLayout: handleLayout,
              onScroll: handleScroll,
              scrollEventThrottle: scrollEventThrottle ?? 16,
            }
          : {
              ...(onContentSizeChange && { onContentSizeChange }),
              ...(onLayout && { onLayout }),
              ...(onScroll && { onScroll }),
              ...(scrollEventThrottle !== undefined && { scrollEventThrottle }),
            })}
        {...(effectiveHistory
          ? {
              ...(canLoadMore
                ? { onStartReached: handleReached }
                : onStartReached
                  ? { onStartReached }
                  : {}),
              onStartReachedThreshold: onStartReachedThreshold ?? 1,
            }
          : {
              ...(onStartReached && { onStartReached }),
              ...(onStartReachedThreshold !== undefined && {
                onStartReachedThreshold,
              }),
            })}
        {...flatListProps}
      />
    );
  },
);
ThreadMessagesFlatList.displayName = "ThreadPrimitive.MessagesFlatList";

/** @deprecated Use ThreadPrimitive.MessagesFlatList instead. */
export const ThreadMessages = forwardRef<
  FlatList<ThreadMessage>,
  ThreadMessagesProps
>(
  (
    {
      autoScroll = false,
      scrollToBottomOnInitialize = false,
      scrollToBottomOnRunStart = false,
      scrollToBottomOnThreadSwitch = false,
      ...props
    },
    ref,
  ) => (
    <ThreadMessagesFlatList
      ref={ref}
      autoScroll={autoScroll}
      scrollToBottomOnInitialize={scrollToBottomOnInitialize}
      scrollToBottomOnRunStart={scrollToBottomOnRunStart}
      scrollToBottomOnThreadSwitch={scrollToBottomOnThreadSwitch}
      {...props}
    />
  ),
);
ThreadMessages.displayName = "ThreadPrimitive.Messages";
