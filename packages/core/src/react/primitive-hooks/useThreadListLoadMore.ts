import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { handleThreadListAction } from "./handleThreadListAction";

export const useThreadListLoadMore = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) => !s.threads.hasMore || s.threads.isLoading || s.threads.isLoadingMore,
  );

  const loadMore = useCallback(() => {
    return handleThreadListAction("load more", () => aui.threads.loadMore());
  }, [aui]);

  return { loadMore, disabled };
};
