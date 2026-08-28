import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useMessageBranching = () => {
  const aui = useAui();
  const branchNumber = useAuiState("message", (s) => s.branchNumber);
  const branchCount = useAuiState("message", (s) => s.branchCount);

  const goToPrev = useCallback(() => {
    aui.message.switchToBranch({ position: "previous" });
  }, [aui]);

  const goToNext = useCallback(() => {
    aui.message.switchToBranch({ position: "next" });
  }, [aui]);

  return { branchNumber, branchCount, goToPrev, goToNext };
};
