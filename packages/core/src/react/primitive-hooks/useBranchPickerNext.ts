import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useBranchPickerNext = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => {
    if (s.message.branchNumber >= s.message.branchCount) return true;
    if (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun) {
      return true;
    }
    return false;
  });

  const next = useCallback(() => {
    aui.message().switchToBranch({ position: "next" });
  }, [aui]);

  return { next, disabled };
};
