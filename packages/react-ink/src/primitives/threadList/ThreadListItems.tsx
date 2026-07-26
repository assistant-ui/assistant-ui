import type { ReactElement } from "react";
import { Box } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { ThreadListItemByIndexProvider } from "@assistant-ui/core/react";

export type ThreadListItemsProps = {
  renderItem: (props: { threadId: string; index: number }) => ReactElement;
};

export const ThreadListItems = ({ renderItem }: ThreadListItemsProps) => {
  const threadIds = useAuiState((s) => s.threads.threadIds);

  return (
    <Box flexDirection="column">
      {threadIds.map((threadId, index) => (
        <ThreadListItemByIndexProvider
          key={threadId}
          index={index}
          archived={false}
        >
          {renderItem({ threadId, index })}
        </ThreadListItemByIndexProvider>
      ))}
    </Box>
  );
};
