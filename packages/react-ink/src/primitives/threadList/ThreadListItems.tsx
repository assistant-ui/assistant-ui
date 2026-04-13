import type { ReactElement } from "react";
import { Box } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type ThreadListItemsProps = {
  renderItem: (props: { threadId: string; index: number }) => ReactElement;
};

export const ThreadListItems = ({ renderItem }: ThreadListItemsProps) => {
  const threadIds = useAuiState((s) => s.threads.threadIds);

  return (
    <Box flexDirection="column">
      {(threadIds as string[]).map((threadId, index) =>
        renderItem({ threadId, index }),
      )}
    </Box>
  );
};
