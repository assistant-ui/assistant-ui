import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useThreadListItemUnarchive = () => {
  const aui = useAui();
  const canUnarchive = useAuiState((s) => s.threads.canUnarchive);

  const unarchive = useCallback(() => {
    aui.threadListItem.unarchive();
  }, [aui]);

  return { unarchive, disabled: !canUnarchive };
};
