import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { branchPickerNextDisabled } from "../../store/primitive-predicates";

export const useBranchPickerNext = () => {
  const aui = useAui();
  const disabled = useAuiState(branchPickerNextDisabled);

  const next = useCallback(() => {
    aui.message.switchToBranch({ position: "next" });
  }, [aui]);

  return { next, disabled };
};
