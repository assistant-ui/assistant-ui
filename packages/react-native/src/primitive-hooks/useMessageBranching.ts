import { useCallback } from "react";
import { useMessageRuntime } from "../hooks/useMessageRuntime";
import { useMessage } from "../hooks/useMessage";
import { useThreadContext } from "../context/ThreadContext";

export const useMessageBranching = () => {
  const messageRuntime = useMessageRuntime();
  const threadRuntime = useThreadContext();
  const canSwitchBranch = threadRuntime.getState().capabilities.switchToBranch;

  const branchNumber = useMessage((state) => state.branchNumber);
  const branchCount = useMessage((state) => state.branchCount);

  const goToPreviousBranch = useCallback(() => {
    if (!canSwitchBranch || branchNumber <= 1) return;
    messageRuntime.switchToBranch({ position: "previous" });
  }, [messageRuntime, canSwitchBranch, branchNumber]);

  const goToNextBranch = useCallback(() => {
    if (!canSwitchBranch || branchNumber >= branchCount) return;
    messageRuntime.switchToBranch({ position: "next" });
  }, [messageRuntime, canSwitchBranch, branchNumber, branchCount]);

  return {
    branchNumber,
    branchCount,
    canGoToPreviousBranch: canSwitchBranch && branchNumber > 1,
    canGoToNextBranch: canSwitchBranch && branchNumber < branchCount,
    goToPreviousBranch,
    goToNextBranch,
  };
};
