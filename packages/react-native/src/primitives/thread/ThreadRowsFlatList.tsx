import { forwardRef, useCallback, useMemo } from "react";
import { FlatList, type FlatListProps } from "react-native";
import {
  createThreadRowsSelector,
  ThreadPrimitiveRow,
  type ThreadRow,
  type ThreadRowsOptions,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import {
  type FlatListHistory,
  getFlatListPagingProps,
  useComposedFlatListRef,
  useFlatListAutoScroll,
  useFlatListScrollProps,
  useHistoryLoad,
  useThreadHistory,
} from "./flatListScroll";

export type ThreadRowsFlatListProps = Omit<
  FlatListProps<ThreadRow>,
  "data" | "renderItem" | "children" | "keyExtractor"
> & {
  /** Same contract as `MessagePrimitive.GroupedParts`; keep a stable identity (module scope or `useCallback`) or every row cache rebuilds and re-renders. */
  groupBy?: ThreadRowsOptions["groupBy"];
  /** Renders each row through `ThreadPrimitive.Row`. */
  children: ThreadPrimitiveRow.Props["children"];
  autoScroll?: boolean | undefined;
  scrollToBottomOnRunStart?: boolean | undefined;
  scrollToBottomOnInitialize?: boolean | undefined;
  scrollToBottomOnThreadSwitch?: boolean | undefined;
  /** Pages older messages from app state or the runtime when the list nears its history edge. */
  history?: FlatListHistory | undefined;
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

    const scrollProps = useFlatListScrollProps({
      autoScroll,
      scrollToBottomOnInitialize,
      scrollToBottomOnRunStart,
      scrollToBottomOnThreadSwitch,
      onContentSizeChange,
      onLayout,
      onScroll,
      scrollEventThrottle,
      handleAutoScrollContentSizeChange,
      handleAutoScrollLayout,
      handleAutoScrollScroll,
    });
    type StartInfo = Parameters<
      NonNullable<FlatListProps<ThreadRow>["onStartReached"]>
    >[0];
    type EndInfo = Parameters<
      NonNullable<FlatListProps<ThreadRow>["onEndReached"]>
    >[0];
    const onHistoryReached = useCallback(
      (info: StartInfo | EndInfo) => {
        if (inverted) onEndReached?.(info as EndInfo);
        else onStartReached?.(info as StartInfo);
      },
      [inverted, onEndReached, onStartReached],
    );
    const { canLoadMore, handleReached } = useHistoryLoad<StartInfo | EndInfo>(
      effectiveHistory,
      onHistoryReached,
    );
    const pagingProps = getFlatListPagingProps(
      inverted ? "end" : "start",
      effectiveHistory,
      canLoadMore,
      handleReached,
      {
        onStartReached,
        onStartReachedThreshold,
        onEndReached,
        onEndReachedThreshold,
      },
    );

    return (
      <FlatList
        ref={setFlatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted={inverted}
        maintainVisibleContentPosition={
          inverted
            ? { minIndexForVisible: 0, autoscrollToTopThreshold: 4 }
            : { minIndexForVisible: 0 }
        }
        {...scrollProps}
        {...pagingProps}
        {...flatListProps}
      />
    );
  },
);
ThreadRowsFlatList.displayName = "ThreadPrimitive.RowsFlatList";
