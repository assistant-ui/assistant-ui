import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useThreadListLoadMore = () => {
  const aui = useAui();
  const threads = useAuiState("threads");
  const disabled =
    !threads.hasMore || threads.isLoading || threads.isLoadingMore;

  const loadMore = useCallback(() => {
    aui.threads.loadMore();
  }, [aui]);

  return { loadMore, disabled };
};
