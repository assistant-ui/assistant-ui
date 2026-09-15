import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import {
  groupedIconButtonHitSlop,
  iconButtonClassName,
  iconButtonHitSlop,
} from "@/components/assistant-ui/elements/icon-button";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import {
  ShimmerLabel,
  useAnnounce,
  webLiveRegion,
} from "@/components/assistant-ui/elements/surfaces";
import { TypingIndicator } from "@/components/assistant-ui/elements/typing-indicator";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type TextMessagePartComponent,
  type ThreadMessage,
  type ToolCallMessagePartComponent,
  useAui,
  useAuiState,
} from "@assistant-ui/react-native";
import * as Clipboard from "expo-clipboard";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  WrenchIcon,
} from "lucide-react-native";
import {
  type ComponentType,
  createContext,
  type FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AccessibilityInfo,
  type FlatList,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Text,
  View,
  type ViewProps,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  ToolFallback?: ToolCallMessagePartComponent | undefined;
  /** Replaces the text input of both the new message composer and the edit composer; read `composer.type` to tell them apart. */
  ComposerInput?: ComponentType | undefined;
  /** Overlays the message list, which keeps a gutter free along its left edge for it; it reads the list through `useThreadViewport`. Mounting or unmounting it remounts the list. */
  Rail?: ComponentType | undefined;
};

export type ThreadHistory = {
  /** Whether messages older than the loaded window exist. */
  readonly hasMore: boolean;
  /** Whether a page of older messages is on its way. */
  readonly isLoadingMore: boolean;
  /** Loads the next page of older messages above the window. */
  readonly loadMore: () => void;
};

export type ThreadProps = {
  components?: ThreadComponents | undefined;
  /** A windowed thread: the list asks for older messages when it reaches its start and shows the loading edge above them. */
  history?: ThreadHistory | undefined;
};

export type ThreadViewportSnapshot = {
  /** The ids of the messages on screen, in list order. */
  readonly visibleMessageIds: readonly string[];
  /**
   * Zero until the list is within one screenful of its end, then the share of
   * that stretch scrolled, so a reading line placed at this fraction of the
   * viewport can still reach the final turns.
   */
  readonly descent: number;
  /** The message list's height. */
  readonly height: number;
  /** The message list's offset from the top of the thread viewport, which grows while the history edge shows. */
  readonly top: number;
};

export type ThreadViewport = ThreadViewportSnapshot & {
  /** Scrolls the message list until the message starts at the top of the viewport. */
  readonly scrollToMessage: (id: string) => void;
};

type ThreadViewportStore = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => ThreadViewportSnapshot;
  readonly scrollToMessage: (id: string) => void;
};

const EMPTY_COMPONENTS: ThreadComponents = {};
const EMPTY_IDS: readonly string[] = [];
const IDLE_VIEWPORT: ThreadViewportSnapshot = {
  visibleMessageIds: EMPTY_IDS,
  descent: 0,
  height: 0,
  top: 0,
};
const MESSAGE_VIEWABILITY = {
  minimumViewTime: 0,
  viewAreaCoveragePercentThreshold: 0,
};
const SCROLL_RETRY_DELAY = 100;

const ThreadComponentsContext =
  createContext<ThreadComponents>(EMPTY_COMPONENTS);

const ThreadViewportContext = createContext<ThreadViewportStore>({
  subscribe: () => () => {},
  getSnapshot: () => IDLE_VIEWPORT,
  scrollToMessage: () => {},
});

const createViewportStore = () => {
  const listeners = new Set<() => void>();
  let snapshot = IDLE_VIEWPORT;

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    publish: (next: Partial<ThreadViewportSnapshot>) => {
      snapshot = { ...snapshot, ...next };
      for (const listener of listeners) listener();
    },
  };
};

/** What the thread's message list shows right now, for an element that overlays it. */
export const useThreadViewport = (): ThreadViewport => {
  const { subscribe, getSnapshot, scrollToMessage } = useContext(
    ThreadViewportContext,
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({ ...snapshot, scrollToMessage }),
    [snapshot, scrollToMessage],
  );
};

const copyToClipboard = async (text: string) => {
  await Clipboard.setStringAsync(text);
};

export const Thread: FC<ThreadProps> = ({
  components = EMPTY_COMPONENTS,
  history,
}) => {
  const aui = useAui();
  const isEmpty = useAuiState(isNewChatView);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const insets = useSafeAreaInsets();
  const viewportRef = useRef<View>(null);
  const [viewportTop, setViewportTop] = useState(0);
  const [store] = useState(createViewportStore);
  const listRef = useRef<FlatList<ThreadMessage>>(null);
  const metricsRef = useRef({
    contentHeight: 0,
    viewportHeight: 0,
    scrollY: 0,
  });
  const jumpRef = useRef<
    | {
        id: string;
        retried: boolean;
        timer: ReturnType<typeof setTimeout> | undefined;
      }
    | undefined
  >(undefined);
  const { Rail } = components;

  useEffect(() => () => clearTimeout(jumpRef.current?.timer), []);

  const jumpTo = useCallback(
    (id: string) => {
      const index = aui.thread
        .getState()
        .messages.findIndex((message) => message.id === id);
      if (index === -1) return;
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    },
    [aui],
  );

  const scrollToMessage = useCallback(
    (id: string) => {
      clearTimeout(jumpRef.current?.timer);
      jumpRef.current = { id, retried: false, timer: undefined };
      jumpTo(id);
    },
    [jumpTo],
  );

  // The list cannot scroll to a row it has not laid out yet: an instant jump
  // to the estimated offset gets it rendering near the row, and one retry,
  // resolved by id again so a changed list cannot send it to another turn,
  // lands on the row itself.
  const onScrollToIndexFailed = useCallback(
    ({
      index,
      averageItemLength,
    }: {
      index: number;
      averageItemLength: number;
    }) => {
      listRef.current?.scrollToOffset({
        offset: index * averageItemLength,
        animated: false,
      });
      const jump = jumpRef.current;
      if (!jump || jump.retried) return;
      jump.retried = true;
      jump.timer = setTimeout(() => jumpTo(jump.id), SCROLL_RETRY_DELAY);
    },
    [jumpTo],
  );

  const publishDescent = useCallback(() => {
    const { contentHeight, viewportHeight, scrollY } = metricsRef.current;
    const remaining = contentHeight - viewportHeight - scrollY;
    const descent =
      viewportHeight > 0
        ? Math.round(
            Math.min(
              1,
              Math.max(0, (viewportHeight - remaining) / viewportHeight),
            ) * 100,
          ) / 100
        : 0;
    if (descent !== store.getSnapshot().descent) store.publish({ descent });
  }, [store]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ThreadMessage>[] }) => {
      store.publish({
        visibleMessageIds: viewableItems.map((token) => token.item.id),
      });
    },
    [store],
  );

  const onListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      metricsRef.current = {
        contentHeight: contentSize.height,
        viewportHeight: layoutMeasurement.height,
        scrollY: contentOffset.y,
      };
      publishDescent();
    },
    [publishDescent],
  );

  const onListContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metricsRef.current.contentHeight = height;
      publishDescent();
    },
    [publishDescent],
  );

  const onListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      metricsRef.current.viewportHeight = height;
      const snapshot = store.getSnapshot();
      if (height !== snapshot.height || y !== snapshot.top) {
        store.publish({ height, top: y });
      }
      publishDescent();
    },
    [publishDescent, store],
  );

  const viewport = useMemo(
    () => ({
      subscribe: store.subscribe,
      getSnapshot: store.getSnapshot,
      scrollToMessage,
    }),
    [store, scrollToMessage],
  );

  useEffect(() => {
    if (isRunning) {
      AccessibilityInfo.announceForAccessibility("Assistant is working");
    }
  }, [isRunning]);

  // KeyboardAvoidingView measures its frame against its parent, so a navigation
  // header above the thread would leave the composer covered by the header's
  // height; the viewport's window position supplies that offset, minus the
  // bottom inset the footer already pads.
  const measureViewport = () => {
    viewportRef.current?.measureInWindow((_x, y) => setViewportTop(y));
  };

  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadViewportContext.Provider value={viewport}>
        <ThreadPrimitive.Root className="aui-root aui-thread-root bg-background flex-1">
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={viewportTop - insets.bottom}
          >
            <View
              ref={viewportRef}
              onLayout={measureViewport}
              className={cn(
                "aui-thread-viewport mx-auto w-full max-w-[44rem] flex-1",
                isEmpty && "justify-center",
              )}
            >
              <AuiIf condition={isNewChatView}>
                <WelcomeSlot />
              </AuiIf>
              <AuiIf condition={isHistoryLoadingView}>
                <ThreadHistorySkeleton />
              </AuiIf>
              <AuiIf condition={(s) => s.thread.messages.length > 0}>
                {history?.isLoadingMore && <HistoryEdge />}
                <ThreadPrimitive.MessagesFlatList
                  // Viewability props cannot change once a FlatList is mounted.
                  key={Rail ? "tracked" : "plain"}
                  ref={listRef}
                  className="aui-message-group flex-1"
                  contentContainerClassName={cn(
                    "gap-6 px-4 pt-4 pb-6",
                    Rail && "pl-10",
                  )}
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  {...(Rail
                    ? {
                        onContentSizeChange: onListContentSizeChange,
                        onLayout: onListLayout,
                        onScroll: onListScroll,
                        onScrollToIndexFailed,
                        onViewableItemsChanged,
                        viewabilityConfig: MESSAGE_VIEWABILITY,
                      }
                    : {})}
                  {...(history
                    ? {
                        onStartReached:
                          history.hasMore && !history.isLoadingMore
                            ? () => history.loadMore()
                            : undefined,
                        // Without a threshold the list only asks within two pixels of its start.
                        onStartReachedThreshold: 1,
                      }
                    : {})}
                >
                  {() => <ThreadMessage />}
                </ThreadPrimitive.MessagesFlatList>
              </AuiIf>
              <View
                className="aui-thread-viewport-footer gap-4 px-4"
                style={{ paddingBottom: insets.bottom + 8 }}
              >
                <Composer />
                <AuiIf
                  condition={(s) => isNewChatView(s) && s.composer.isEmpty}
                >
                  <ThreadSuggestions />
                </AuiIf>
              </View>
              {Rail && (
                <View
                  pointerEvents="box-none"
                  className="aui-thread-rail absolute inset-0"
                >
                  <Rail />
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </ThreadPrimitive.Root>
      </ThreadViewportContext.Provider>
    </ThreadComponentsContext.Provider>
  );
};

const WelcomeSlot: FC = () => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext);
  return <Welcome />;
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  const { AssistantMessage: CustomAssistantMessage } = useContext(
    ThreadComponentsContext,
  );

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  const Assistant = CustomAssistantMessage ?? AssistantMessage;
  return <Assistant />;
};

// The edge sits above the list rather than inside it as a header: the list
// keeps its first visible row anchored, so a header inserted above that row
// would land outside the viewport instead of pushing into it.
const HistoryEdge: FC = () => {
  useAnnounce("Loading earlier messages");

  return (
    <View
      className="aui-thread-history-edge items-center pb-4"
      accessibilityLiveRegion={webLiveRegion}
    >
      <ShimmerLabel className="text-muted-foreground text-[13px]">
        Loading earlier messages
      </ShimmerLabel>
    </View>
  );
};

const ThreadHistorySkeleton: FC = () => (
  <View
    className="aui-thread-history-skeleton gap-6 px-4 pt-4"
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel="Loading conversation"
  >
    <View className="bg-muted ml-auto h-9 w-2/5 rounded-xl" />
    <View className="gap-2">
      <View className="bg-muted h-4 w-11/12 rounded" />
      <View className="bg-muted h-4 w-4/5 rounded" />
      <View className="bg-muted h-4 w-3/5 rounded" />
    </View>
    <View className="bg-muted ml-auto h-9 w-1/3 rounded-xl" />
    <View className="gap-2">
      <View className="bg-muted h-4 w-10/12 rounded" />
      <View className="bg-muted h-4 w-2/3 rounded" />
    </View>
  </View>
);

const ThreadWelcome: FC = () => (
  <View className="aui-thread-welcome-root mb-6 items-center px-4">
    <Text className="aui-thread-welcome-message text-foreground text-center text-2xl font-medium tracking-tight">
      How can I help you today?
    </Text>
  </View>
);

const ThreadSuggestions: FC = () => (
  <View className="aui-thread-welcome-suggestions w-full flex-row flex-wrap items-center justify-center gap-2">
    <ThreadPrimitive.Suggestions>
      {() => <ThreadSuggestionItem />}
    </ThreadPrimitive.Suggestions>
  </View>
);

const ThreadSuggestionItem: FC = () => (
  <SuggestionPrimitive.Trigger
    send
    className="aui-thread-welcome-suggestion border-border/60 active:bg-muted flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5"
  >
    <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 text-foreground text-sm" />
    <AuiIf condition={(s) => !!s.suggestion.label}>
      <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground text-sm" />
    </AuiIf>
  </SuggestionPrimitive.Trigger>
);

const DefaultComposerInput: FC = () => (
  <ComposerPrimitive.Input
    placeholder="Send a message..."
    placeholderTextColorClassName="accent-muted-foreground/60"
    className="aui-composer-input text-foreground web:resize-none web:outline-none max-h-48 min-h-10 px-2.5 py-1 text-base leading-6"
    multiline
    accessibilityLabel="Message input"
  />
);

const Composer: FC = () => {
  const { ComposerInput = DefaultComposerInput } = useContext(
    ThreadComponentsContext,
  );

  return (
    <ComposerPrimitive.Root className="aui-composer-root w-full">
      <View className="aui-composer-shell border-border/60 dark:border-muted-foreground/15 bg-card gap-2 rounded-3xl border p-2">
        <ComposerAttachments />
        <ComposerInput />
        <ComposerAction />
      </View>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => (
  <View className="aui-composer-action-wrapper flex-row items-center justify-between">
    <ComposerAddAttachment />
    <View className="flex-row items-center gap-1.5">
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send
          className="aui-composer-send bg-primary active:bg-primary/90 size-7 items-center justify-center rounded-full disabled:opacity-50"
          hitSlop={iconButtonHitSlop}
          accessibilityLabel="Send message"
        >
          <Icon
            as={ArrowUpIcon}
            className="aui-composer-send-icon text-primary-foreground size-4"
          />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          className="aui-composer-cancel bg-primary active:bg-primary/90 size-7 items-center justify-center rounded-full"
          hitSlop={iconButtonHitSlop}
          accessibilityLabel="Stop generating"
        >
          <View className="aui-composer-cancel-icon bg-primary-foreground size-3 rounded-[2px]" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </View>
  </View>
);

const MessageError: FC = () => (
  <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 dark:bg-destructive/5 mt-2 rounded-md border p-3">
    <ErrorPrimitive.Message
      className="aui-message-error-message text-destructive text-sm"
      numberOfLines={2}
    />
  </ErrorPrimitive.Root>
);

const UserText: TextMessagePartComponent = ({ text }) => (
  <Text
    className="aui-user-message-text text-foreground text-base leading-6"
    selectable
  >
    {text}
  </Text>
);

const AssistantIndicator: FC = () => {
  const isRunning = useAuiState((s) => s.message.status?.type === "running");
  if (!isRunning) return null;

  return (
    <TypingIndicator
      variant="bare"
      announce={false}
      className="aui-assistant-message-indicator py-2"
      accessibilityLabel="Assistant is working"
    />
  );
};

const ToolFallback: ToolCallMessagePartComponent = ({ toolName, status }) => (
  <View className="aui-tool-fallback-root border-border bg-card my-1 flex-row items-center gap-2 rounded-xl border px-3 py-2">
    <Icon as={WrenchIcon} className="text-muted-foreground size-4" />
    <Text className="aui-tool-fallback-title text-muted-foreground text-sm">
      {status.type === "running" ? `Running ${toolName}…` : `Used ${toolName}`}
    </Text>
  </View>
);

const AssistantMessage: FC = () => {
  const { ToolFallback: CustomToolFallback } = useContext(
    ThreadComponentsContext,
  );

  return (
    <MessagePrimitive.Root className="aui-assistant-message-root">
      <View className="aui-assistant-message-content px-2">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            Empty: AssistantIndicator,
            tools: { Fallback: CustomToolFallback ?? ToolFallback },
          }}
        />
        <MessageError />
      </View>
      <View className="aui-assistant-message-footer ms-2 min-h-7.5 flex-row items-center pt-1.5">
        <BranchPicker />
        <AssistantActionBar />
      </View>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => (
  <AuiIf
    condition={(s) =>
      !(s.message.role === "assistant" && s.message.status?.type === "running")
    }
  >
    <View className="aui-assistant-action-bar-root -ms-1 flex-row gap-1">
      <ActionBarPrimitive.Copy
        copyToClipboard={copyToClipboard}
        className={iconButtonClassName}
        hitSlop={groupedIconButtonHitSlop}
        accessibilityLabel="Copy"
      >
        {({ isCopied }) => (
          <Icon
            as={isCopied ? CheckIcon : CopyIcon}
            className="text-muted-foreground size-4"
          />
        )}
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload
        className={iconButtonClassName}
        hitSlop={groupedIconButtonHitSlop}
        accessibilityLabel="Refresh"
      >
        <Icon as={RefreshCwIcon} className="text-muted-foreground size-4" />
      </ActionBarPrimitive.Reload>
    </View>
  </AuiIf>
);

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="aui-user-message-root items-end gap-y-2 px-2">
    <UserMessageAttachments />
    <View className="aui-user-message-content bg-muted max-w-[85%] rounded-xl px-4 py-2">
      <MessagePrimitive.Parts components={{ Text: UserText }} />
    </View>
    <View className="aui-user-message-footer -me-1 flex-row items-center justify-end">
      <BranchPicker />
      <UserActionBar />
    </View>
  </MessagePrimitive.Root>
);

const UserActionBar: FC = () => (
  <AuiIf condition={(s) => !s.thread.isRunning}>
    <ActionBarPrimitive.Edit
      className={cn(iconButtonClassName, "aui-user-action-edit")}
      hitSlop={groupedIconButtonHitSlop}
      accessibilityLabel="Edit"
    >
      <Icon as={PencilIcon} className="text-muted-foreground size-4" />
    </ActionBarPrimitive.Edit>
  </AuiIf>
);

const DefaultEditComposerInput: FC = () => (
  <ComposerPrimitive.Input
    className="aui-edit-composer-input text-foreground web:resize-none web:outline-none min-h-14 px-4 pt-3 pb-1 text-base"
    multiline
    autoFocus
  />
);

const EditComposer: FC = () => {
  const { ComposerInput = DefaultEditComposerInput } = useContext(
    ThreadComponentsContext,
  );

  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper px-2">
      <ComposerPrimitive.Root className="aui-edit-composer-root border-border/60 dark:border-muted-foreground/15 bg-card ms-auto w-full max-w-[85%] rounded-3xl border">
        <ComposerInput />
        <View className="aui-edit-composer-footer mx-2.5 mb-2.5 flex-row items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel className="active:bg-accent h-8 justify-center rounded-full px-3.5">
            <Text className="text-foreground text-sm font-medium">Cancel</Text>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send className="bg-primary active:bg-primary/90 h-8 justify-center rounded-full px-3.5">
            <Text className="text-primary-foreground text-sm font-medium">
              Update
            </Text>
          </ComposerPrimitive.Send>
        </View>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<ViewProps> = ({ className, ...rest }) => {
  const branchCount = useAuiState((s) => s.message.branchCount);
  if (branchCount <= 1) return null;

  return (
    <View
      className={cn(
        "aui-branch-picker-root -ms-2 me-2 flex-row items-center",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous
        className={cn(iconButtonClassName, "disabled:opacity-35")}
        hitSlop={groupedIconButtonHitSlop}
        accessibilityLabel="Previous"
      >
        <Icon as={ChevronLeftIcon} className="text-muted-foreground size-4" />
      </BranchPickerPrimitive.Previous>
      <Text className="aui-branch-picker-state text-muted-foreground text-xs font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </Text>
      <BranchPickerPrimitive.Next
        className={cn(iconButtonClassName, "disabled:opacity-35")}
        hitSlop={groupedIconButtonHitSlop}
        accessibilityLabel="Next"
      >
        <Icon as={ChevronRightIcon} className="text-muted-foreground size-4" />
      </BranchPickerPrimitive.Next>
    </View>
  );
};
