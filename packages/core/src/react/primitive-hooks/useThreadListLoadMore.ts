import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { threadListLoadMoreDisabled } from "../../store/primitive-predicates";

export const useThreadListLoadMore = () => {
  const aui = useAui();
  const disabled = useAuiState(threadListLoadMoreDisabled);

  const loadMore = useCallback(() => {
    aui.threads.loadMore();
  }, [aui]);

  return { loadMore, disabled };
};
