import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { threadListItemUnarchiveDisabled } from "../../store/primitive-predicates";

export const useThreadListItemUnarchive = () => {
  const aui = useAui();
  const disabled = useAuiState(threadListItemUnarchiveDisabled);

  const unarchive = useCallback(() => {
    if (disabled) return;
    aui.threadListItem.unarchive();
  }, [aui, disabled]);

  return { unarchive, disabled };
};
