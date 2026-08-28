import { useCallback } from "react";
import { useAui, useAuiState, type AssistantState } from "@assistant-ui/store";
import { branchPickerPreviousDisabled } from "../../store/primitive-predicates";

export const useBranchPickerPrevious = () => {
  const aui = useAui();
  const thread = useAuiState("thread");
  const message = useAuiState("message");
  const disabled = branchPickerPreviousDisabled({
    thread,
    message,
  } as AssistantState);

  const previous = useCallback(() => {
    aui.message.switchToBranch({ position: "previous" });
  }, [aui]);

  return { previous, disabled };
};
