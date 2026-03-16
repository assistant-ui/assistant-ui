import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useMessageBranching = () => {
  const aui = useAui();
  const branchNumber = useAuiState((s) => s.message.branchNumber);
  const branchCount = useAuiState((s) => s.message.branchCount);

  const goToPrev = useCallback(() => {
    aui.message().switchToBranch({ position: "previous" });
  }, [aui]);

  const goToNext = useCallback(() => {
    aui.message().switchToBranch({ position: "next" });
  }, [aui]);

  return { branchNumber, branchCount, goToPrev, goToNext };
};
