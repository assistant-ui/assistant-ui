import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { branchPickerPreviousDisabled } from "../../store/primitive-predicates";

export const useBranchPickerPrevious = () => {
  const aui = useAui();
  const disabled = useAuiState(branchPickerPreviousDisabled);

  const previous = useCallback(() => {
    aui.message.switchToBranch({ position: "previous" });
  }, [aui]);

  return { previous, disabled };
};
