import {
  type ForwardedRef,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  type FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useAui, useAuiEvent, useAuiState } from "@assistant-ui/store";

export type FlatListHistory = {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};

const AT_BOTTOM_THRESHOLD = 4;

/** `history` when given, else the runtime's earlier-message paging. */
export const useThreadHistory = (history: FlatListHistory | undefined) => {
  const aui = useAui();
  const hasEarlier = useAuiState((s) => s.thread.hasEarlier);
  const isLoadingEarlier = useAuiState((s) => s.thread.isLoadingEarlier);
  const runtimeHistory = useMemo<FlatListHistory | undefined>(
    () =>
      hasEarlier || isLoadingEarlier
        ? {
            hasMore: hasEarlier,
            isLoadingMore: isLoadingEarlier,
            loadMore: () => {
              void aui.thread.loadEarlier();
            },
          }
        : undefined,
    [aui, hasEarlier, isLoadingEarlier],
  );
  return history ?? runtimeHistory;
};

export const useHistoryLoad = <TInfo>(
  history: FlatListHistory | undefined,
  onReached: ((info: TInfo) => void) | undefined,
) => {
  const loadRequestedRef = useRef(false);
  const hasMore = history?.hasMore ?? false;
  const isLoadingMore = history?.isLoadingMore ?? false;

  // The latch is scoped to one commit so a no-op load cannot disable paging.
  useEffect(() => {
    loadRequestedRef.current = isLoadingMore;
  });

  const handleReached = useCallback(
    (info: TInfo) => {
      onReached?.(info);
      if (loadRequestedRef.current) return;
      loadRequestedRef.current = true;
      try {
        history?.loadMore();
      } catch (error) {
        loadRequestedRef.current = false;
        throw error;
      }
    },
    [history, onReached],
  );

  return {
    canLoadMore: hasMore && !isLoadingMore,
    handleReached,
  };
};

export const setForwardedRef = <T>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

export const useComposedFlatListRef = <T>(
  forwardedRef: ForwardedRef<FlatList<T>>,
) => {
  const flatListRef = useRef<FlatList<T> | null>(null);

  const setFlatListRef = useCallback(
    (node: FlatList<T> | null) => {
      flatListRef.current = node;
      setForwardedRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  return [flatListRef, setFlatListRef] as const;
};

export const useFlatListAutoScroll = <T>({
  flatListRef,
  hasMessages,
  inverted = false,
  horizontal = false,
  autoScroll = true,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: {
  flatListRef: RefObject<FlatList<T> | null>;
  hasMessages: boolean;
  inverted?: boolean | undefined;
  horizontal?: boolean | null | undefined;
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
  const lastScrollEventOffsetRef = useRef(0);
  const initializeScrollRequestedRef = useRef(false);
  const contentSizeVersionRef = useRef(0);
  const pendingScrollToBottomRef = useRef<
    | false
    | {
        animated: boolean;
        minimumContentSizeVersion: number;
      }
  >(false);

  const updateIsAtBottom = useCallback(() => {
    const { contentHeight, scrollY, viewportHeight } = metricsRef.current;
    isAtBottomRef.current = inverted
      ? scrollY <= AT_BOTTOM_THRESHOLD
      : contentHeight <= viewportHeight ||
        contentHeight - scrollY - viewportHeight <= AT_BOTTOM_THRESHOLD;
  }, [inverted]);

  // Commanding a scroll records the intended position immediately; the
  // native scroll echo is bridged and throttled, so waiting for it lets a
  // fast stream observe stale metrics and drop out of following.
  const scrollToBottom = useCallback(
    (animated: boolean) => {
      const { contentHeight, viewportHeight } = metricsRef.current;
      const offset = inverted ? 0 : Math.max(0, contentHeight - viewportHeight);
      metricsRef.current.scrollY = offset;
      isAtBottomRef.current = true;
      flatListRef.current?.scrollToOffset({ offset, animated });
    },
    [flatListRef, inverted],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const wasAtBottom = isAtBottomRef.current;
      const previousViewportHeight = metricsRef.current.viewportHeight;
      const viewportHeight = horizontal
        ? event.nativeEvent.layout.width
        : event.nativeEvent.layout.height;
      metricsRef.current.viewportHeight = viewportHeight;
      updateIsAtBottom();
      const pending = pendingScrollToBottomRef.current;
      if (
        pending &&
        contentSizeVersionRef.current >= pending.minimumContentSizeVersion &&
        viewportHeight > 0
      ) {
        pendingScrollToBottomRef.current = false;
        scrollToBottom(pending.animated);
        return;
      }
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
        scrollToBottom(pending ? pending.animated : false);
      } else {
        isAtBottomRef.current = true;
      }
    },
    [autoScroll, horizontal, scrollToBottom, updateIsAtBottom],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const scrollOffset = horizontal ? contentOffset.x : contentOffset.y;
      const previousEventOffset = lastScrollEventOffsetRef.current;
      const wasPinnedToBottom = isAtBottomRef.current;
      lastScrollEventOffsetRef.current = scrollOffset;
      metricsRef.current = {
        contentHeight: horizontal ? contentSize.width : contentSize.height,
        viewportHeight: horizontal
          ? layoutMeasurement.width
          : layoutMeasurement.height,
        scrollY: scrollOffset,
      };
      updateIsAtBottom();
      const upwardMove = inverted
        ? scrollOffset > previousEventOffset
        : scrollOffset < previousEventOffset;
      // Only a deliberate move away from the bottom unpins or cancels a pending scroll.
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
    [horizontal, inverted, updateIsAtBottom],
  );

  const handleContentSizeChange = useCallback(
    (width: number, height: number) => {
      const metrics = metricsRef.current;
      const contentHeight = horizontal ? width : height;
      const previousContentHeight = metrics.contentHeight;
      const wasAtBottom = isAtBottomRef.current;
      if (contentHeight > 0) contentSizeVersionRef.current += 1;
      metrics.contentHeight = contentHeight;
      updateIsAtBottom();

      // Initialize and thread-switch requests are repeated after the list has
      // measured so the explicit bottom offset uses real content metrics.
      const pendingScroll = pendingScrollToBottomRef.current;
      if (
        pendingScroll &&
        contentSizeVersionRef.current >=
          pendingScroll.minimumContentSizeVersion &&
        metrics.viewportHeight > 0
      ) {
        pendingScrollToBottomRef.current = false;
        scrollToBottom(pendingScroll.animated);
        return;
      }

      if (!autoScroll) return;
      if (!wasAtBottom) return;
      if (previousContentHeight === 0) return;
      if (contentHeight <= previousContentHeight) return;

      scrollToBottom(false);
    },
    [autoScroll, horizontal, scrollToBottom, updateIsAtBottom],
  );

  useEffect(() => {
    if (!scrollToBottomOnInitialize) return;
    if (!hasMessages) {
      initializeScrollRequestedRef.current = false;
      return;
    }
    if (initializeScrollRequestedRef.current) return;

    initializeScrollRequestedRef.current = true;
    pendingScrollToBottomRef.current = {
      animated: false,
      minimumContentSizeVersion: Math.max(1, contentSizeVersionRef.current),
    };
    scrollToBottom(false);
  }, [hasMessages, scrollToBottom, scrollToBottomOnInitialize]);

  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    pendingScrollToBottomRef.current = {
      animated: true,
      minimumContentSizeVersion: contentSizeVersionRef.current + 1,
    };
    scrollToBottom(true);
  });

  useAuiEvent("threads.selectionChanged", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    initializeScrollRequestedRef.current = false;
    lastScrollEventOffsetRef.current = 0;
    pendingScrollToBottomRef.current = {
      animated: false,
      minimumContentSizeVersion: contentSizeVersionRef.current + 1,
    };
    scrollToBottom(false);
  });

  return {
    handleLayout,
    handleScroll,
    handleContentSizeChange,
  };
};
