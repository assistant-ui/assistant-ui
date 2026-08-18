import { type ReactElement, useCallback } from "react";
import { FlatList, type FlatListProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";
import { ThreadListItemByIndexProvider } from "@assistant-ui/core/react";

export type ThreadListItemsProps = Omit<
  FlatListProps<string>,
  "data" | "renderItem"
> & {
  renderItem: (props: { threadId: string; index: number }) => ReactElement;
};

export const ThreadListItems = ({
  renderItem,
  ...flatListProps
}: ThreadListItemsProps) => {
  const threadIds = useAuiState((s) => s.threads.threadIds);

  const renderFlatListItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      return (
        <ThreadListItemByIndexProvider index={index} archived={false}>
          {renderItem({ threadId: item, index })}
        </ThreadListItemByIndexProvider>
      );
    },
    [renderItem],
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <FlatList
      data={threadIds as string[]}
      renderItem={renderFlatListItem}
      keyExtractor={keyExtractor}
      {...flatListProps}
    />
  );
};
