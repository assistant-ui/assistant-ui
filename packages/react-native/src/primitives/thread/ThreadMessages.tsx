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
  const initializeScrollRequestedRef = useRef(false);

  const updateIsAtBottom = useCallback(() => {
    const { contentHeight, scrollY, viewportHeight } = metricsRef.current;
    isAtBottomRef.current =
      contentHeight <= viewportHeight ||
      contentHeight - scrollY - viewportHeight <= AT_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(
    (animated: boolean) => {
      flatListRef.current?.scrollToEnd({ animated });
    },
    [flatListRef],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      metricsRef.current.viewportHeight = event.nativeEvent.layout.height;
      updateIsAtBottom();
    },
    [updateIsAtBottom],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      metricsRef.current = {
        contentHeight: contentSize.height,
        viewportHeight: layoutMeasurement.height,
        scrollY: contentOffset.y,
      };
      updateIsAtBottom();
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
    scrollToBottom(false);
  }, [hasMessages, scrollToBottom, scrollToBottomOnInitialize]);

  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    scrollToBottom(true);
  });

  useAuiEvent("threadListItem.switchedTo", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    initializeScrollRequestedRef.current = false;
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
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        {...flatListProps}
      />
    );
  },
);
ThreadMessagesFlatList.displayName = "ThreadPrimitive.MessagesFlatList";

export const ThreadMessages = forwardRef<
  FlatList<ThreadMessage>,
  ThreadMessagesProps
>((props, ref) => <ThreadMessagesFlatList ref={ref} {...props} />);
ThreadMessages.displayName = "ThreadPrimitive.Messages";
