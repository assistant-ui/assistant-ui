import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useThreadListLoadMore = () => {
  const aui = useAui();
  const disabled = useAuiState(
    "threads",
    (s) => !s.hasMore || s.isLoading || s.isLoadingMore,
  );

  const loadMore = useCallback(() => {
    aui.threads.loadMore();
  }, [aui]);

  return { loadMore, disabled };
};
