import { useCallback } from "react";
import { useAui, useAuiState, type AssistantState } from "@assistant-ui/store";
import { branchPickerNextDisabled } from "../../store/primitive-predicates";

export const useBranchPickerNext = () => {
  const aui = useAui();
  const thread = useAuiState("thread");
  const message = useAuiState("message");
  const disabled = branchPickerNextDisabled({
    thread,
    message,
  } as AssistantState);

  const next = useCallback(() => {
    aui.message.switchToBranch({ position: "next" });
  }, [aui]);

  return { next, disabled };
};
