import { FC, ReactElement, useCallback } from "react";
import { FlatList, FlatListProps } from "react-native";
import { useThreadList } from "../../hooks/useThreadList";
import { ThreadListItemProvider } from "../../context/ThreadListContext";
import type { ThreadListItemState } from "../../runtime/types";

export type ThreadListItemsProps = Omit<
  FlatListProps<ThreadListItemState>,
  "data" | "renderItem"
> & {
  /**
   * Render function for each thread item
   */
  renderItem: (item: ThreadListItemState, index: number) => ReactElement;
};

export const ThreadListItems: FC<ThreadListItemsProps> = ({
  renderItem,
  ...flatListProps
}) => {
  const threads = useThreadList((state) => state.threads);

  const renderListItem = useCallback(
    ({ item, index }: { item: ThreadListItemState; index: number }) => {
      return (
        <ThreadListItemProvider item={item}>
          {renderItem(item, index)}
        </ThreadListItemProvider>
      );
    },
    [renderItem],
  );

  return (
    <FlatList
      data={threads}
      keyExtractor={(item) => item.id}
      renderItem={renderListItem}
      showsVerticalScrollIndicator={false}
      {...flatListProps}
    />
  );
};
