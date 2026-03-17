import { type ReactElement, useCallback } from "react";
import { FlatList, type FlatListProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

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
      return renderItem({ threadId: item, index });
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
