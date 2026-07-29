import {
  type ComponentType,
  type FC,
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { MessageState, ThreadMessage } from "@assistant-ui/core";
import {
  RenderChildrenWithAccessor,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/store";
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

export type ThreadMessagesFlatListProps = Omit<
  FlatListProps<ThreadMessage>,
  "data" | "renderItem" | "children"
> &
  MessagesContent & {
    autoScroll?: boolean | undefined;
    scrollToBottomOnRunStart?: boolean | undefined;
    scrollToBottomOnInitialize?: boolean | undefined;
    scrollToBottomOnThreadSwitch?: boolean | undefined;
  };

/** @deprecated Use ThreadMessagesFlatListProps instead. */
export type ThreadMessagesProps = ThreadMessagesFlatListProps;

const DEFAULT_SYSTEM_MESSAGE = () => null;
const AT_BOTTOM_THRESHOLD = 4;

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

const setForwardedRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

const useComposedFlatListRef = (
  forwardedRef: ForwardedRef<FlatList<ThreadMessage>>,
) => {
  const flatListRef = useRef<FlatList<ThreadMessage> | null>(null);

  const setFlatListRef = useCallback(
    (node: FlatList<ThreadMessage> | null) => {
      flatListRef.current = node;
      setForwardedRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  return [flatListRef, setFlatListRef] as const;
};

const useThreadMessagesFlatListAutoScroll = ({
  flatListRef,
  hasMessages,
  autoScroll = true,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: {
  flatListRef: RefObject<FlatList<ThreadMessage> | null>;
  hasMessages: boolean;
  autoScroll?: boolean | undefined;
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
}) => {
  const metricsRef = useRef({
    contentHeight: 0,
    viewportHeight: 0,
    scrollY: 0,
  });
  const isAtBottomRef = useRef(true);
  const lastScrollEventYRef = useRef(0);
  const initializeScrollRequestedRef = useRef(false);
  const pendingScrollToBottomRef = useRef<false | { animated: boolean }>(false);

  const updateIsAtBottom = useCallback(() => {
    const { contentHeight, scrollY, viewportHeight } = metricsRef.current;
    isAtBottomRef.current =
      contentHeight <= viewportHeight ||
      contentHeight - scrollY - viewportHeight <= AT_BOTTOM_THRESHOLD;
  }, []);

  // Commanding a scroll records the intended position immediately; the
  // native scroll echo is bridged and throttled, so waiting for it lets a
  // fast stream observe stale metrics and drop out of following.
  const scrollToBottom = useCallback(
    (animated: boolean) => {
      const { contentHeight, viewportHeight } = metricsRef.current;
      metricsRef.current.scrollY = Math.max(0, contentHeight - viewportHeight);
      isAtBottomRef.current = true;
      flatListRef.current?.scrollToEnd({ animated });
    },
    [flatListRef],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const wasAtBottom = isAtBottomRef.current;
      const previousViewportHeight = metricsRef.current.viewportHeight;
      const viewportHeight = event.nativeEvent.layout.height;
      metricsRef.current.viewportHeight = viewportHeight;
      updateIsAtBottom();
      if (!wasAtBottom) return;
      // Layout changes are never user gestures, so they must not unpin. Past
      // the first measurement, a viewport change while pinned re-commands the
      // bottom position, since no content-size event follows a bare keyboard
      // open or close.
      if (
        autoScroll &&
        previousViewportHeight !== 0 &&
        viewportHeight !== previousViewportHeight
      ) {
        const pending = pendingScrollToBottomRef.current;
        scrollToBottom(pending ? pending.animated : false);
      } else {
        isAtBottomRef.current = true;
      }
    },
    [autoScroll, scrollToBottom, updateIsAtBottom],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const previousEventY = lastScrollEventYRef.current;
      const wasPinnedToBottom = isAtBottomRef.current;
      lastScrollEventYRef.current = contentOffset.y;
      metricsRef.current = {
        contentHeight: contentSize.height,
        viewportHeight: layoutMeasurement.height,
        scrollY: contentOffset.y,
      };
      updateIsAtBottom();
      const upwardMove = contentOffset.y < previousEventY;
      // Only a deliberate upward move unpins or cancels a pending scroll.
      // Gestures are detected echo-to-echo because a commanded scroll
      // optimistically moves the tracked position ahead of its ascending
      // animation echoes, and those echoes must not unpin mid-flight.
      if (wasPinnedToBottom && !upwardMove) {
        isAtBottomRef.current = true;
      }
      if (!isAtBottomRef.current && upwardMove) {
        pendingScrollToBottomRef.current = false;
      }
    },
    [updateIsAtBottom],
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const metrics = metricsRef.current;
      const previousContentHeight = metrics.contentHeight;
      const wasAtBottom = isAtBottomRef.current;
      metrics.contentHeight = height;
      updateIsAtBottom();

      // FlatList.scrollToEnd is a no-op before the list has measured, so the
      // initialize and thread-switch scrolls land on the next content-size
      // event, once real metrics exist.
      const pendingScroll = pendingScrollToBottomRef.current;
      if (pendingScroll) {
        pendingScrollToBottomRef.current = false;
        scrollToBottom(pendingScroll.animated);
        return;
      }

      if (!autoScroll) return;
      if (!wasAtBottom) return;
      if (previousContentHeight === 0) return;
      if (height <= previousContentHeight) return;

      scrollToBottom(false);
    },
    [autoScroll, scrollToBottom, updateIsAtBottom],
  );

  useEffect(() => {
    if (!scrollToBottomOnInitialize) return;
    if (!hasMessages) {
      initializeScrollRequestedRef.current = false;
      return;
    }
    if (initializeScrollRequestedRef.current) return;

    initializeScrollRequestedRef.current = true;
    pendingScrollToBottomRef.current = { animated: false };
    scrollToBottom(false);
  }, [hasMessages, scrollToBottom, scrollToBottomOnInitialize]);

  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    pendingScrollToBottomRef.current = { animated: true };
    scrollToBottom(true);
  });

  useAuiEvent("threadListItem.switchedTo", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    initializeScrollRequestedRef.current = false;
    lastScrollEventYRef.current = 0;
    pendingScrollToBottomRef.current = { animated: false };
    scrollToBottom(false);
  });

  return {
    handleLayout,
    handleScroll,
    handleContentSizeChange,
  };
};

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
      scrollEventThrottle,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
      ...flatListProps
    },
    forwardedRef,
  ) => {
    const messages = useAuiState((s) => s.thread.messages);
    const [flatListRef, setFlatListRef] = useComposedFlatListRef(forwardedRef);
    const {
      handleContentSizeChange: handleAutoScrollContentSizeChange,
      handleLayout: handleAutoScrollLayout,
      handleScroll: handleAutoScrollScroll,
    } = useThreadMessagesFlatListAutoScroll({
      flatListRef,
      hasMessages: messages.length > 0,
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

    return (
      <FlatList
        ref={setFlatListRef}
        data={messages as unknown as ThreadMessage[]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
