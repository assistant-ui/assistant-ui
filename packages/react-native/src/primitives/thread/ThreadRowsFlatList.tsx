import { forwardRef, useCallback, useMemo } from "react";
import {
  FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  createThreadRowsSelector,
  ThreadPrimitiveRow,
  type ThreadRow,
  type ThreadRowsOptions,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessagesFlatListProps } from "./ThreadMessages";
import {
  useComposedFlatListRef,
  useFlatListAutoScroll,
  useHistoryLoad,
  useThreadHistory,
} from "./flatListScroll";

export type ThreadRowsFlatListProps = Omit<
  FlatListProps<ThreadRow>,
  "data" | "renderItem" | "children" | "keyExtractor"
> & {
  /** Coalesces adjacent assistant parts into one row. */
  groupBy?: ThreadRowsOptions["groupBy"];
  /** Renders each row through `ThreadPrimitive.Row`. */
  children: ThreadPrimitiveRow.Props["children"];
  autoScroll?: boolean | undefined;
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
  history?: ThreadMessagesFlatListProps["history"];
};

/** Virtualizes flattened thread rows while keeping the visible row anchored. */
export const ThreadRowsFlatList = forwardRef<
  FlatList<ThreadRow>,
  ThreadRowsFlatListProps
>(
  (
    {
      groupBy,
      children,
      inverted = false,
      autoScroll,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
      history,
      onContentSizeChange,
      onLayout,
      onScroll,
      onStartReached,
      onStartReachedThreshold,
      onEndReached,
      onEndReachedThreshold,
      scrollEventThrottle,
      ...flatListProps
    },
    forwardedRef,
  ) => {
    const selectRows = useMemo(
      () => createThreadRowsSelector({ groupBy }),
      [groupBy],
    );
    const rows = useAuiState(selectRows);
    const data = useMemo(
      () => (inverted ? [...rows].reverse() : rows) as ThreadRow[],
      [inverted, rows],
    );
    const effectiveHistory = useThreadHistory(history);
    const [flatListRef, setFlatListRef] = useComposedFlatListRef(forwardedRef);
    const {
      handleContentSizeChange: handleAutoScrollContentSizeChange,
      handleLayout: handleAutoScrollLayout,
      handleScroll: handleAutoScrollScroll,
    } = useFlatListAutoScroll({
      flatListRef,
      hasMessages: rows.length > 0,
      inverted,
      horizontal: flatListProps.horizontal,
      autoScroll,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
    });

    const renderItem = useCallback(
      ({ item }: { item: ThreadRow }) => (
        <ThreadPrimitiveRow row={item}>{children}</ThreadPrimitiveRow>
      ),
      [children],
    );
    const keyExtractor = useCallback((row: ThreadRow) => row.key, []);

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
    type StartInfo = Parameters<
      NonNullable<FlatListProps<ThreadRow>["onStartReached"]>
    >[0];
    type EndInfo = Parameters<
      NonNullable<FlatListProps<ThreadRow>["onEndReached"]>
    >[0];
    const { canLoadMore, handleReached } = useHistoryLoad<StartInfo | EndInfo>(
      effectiveHistory,
      (info) => {
        if (inverted) onEndReached?.(info as EndInfo);
        else onStartReached?.(info as StartInfo);
      },
    );

    const pagingProps = inverted
      ? {
          ...(onStartReached && { onStartReached }),
          ...(onStartReachedThreshold !== undefined && {
            onStartReachedThreshold,
          }),
          ...(effectiveHistory
            ? {
                ...(canLoadMore
                  ? { onEndReached: handleReached }
                  : onEndReached
                    ? { onEndReached }
                    : {}),
                onEndReachedThreshold: onEndReachedThreshold ?? 1,
              }
            : {
                ...(onEndReached && { onEndReached }),
                ...(onEndReachedThreshold !== undefined && {
                  onEndReachedThreshold,
                }),
              }),
        }
      : {
          ...(onEndReached && { onEndReached }),
          ...(onEndReachedThreshold !== undefined && {
            onEndReachedThreshold,
          }),
          ...(effectiveHistory
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
              }),
        };

    return (
      <FlatList
        ref={setFlatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted={inverted}
        maintainVisibleContentPosition={
          inverted
            ? { minIndexForVisible: 1, autoscrollToTopThreshold: 4 }
            : { minIndexForVisible: 0 }
        }
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
        {...pagingProps}
        {...flatListProps}
      />
    );
  },
);
ThreadRowsFlatList.displayName = "ThreadPrimitive.RowsFlatList";
