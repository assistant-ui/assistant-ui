import { useCallback } from "react";
import { useMessageRuntime } from "../context";
import { useMessage } from "../hooks/useMessage";

export const useMessageBranching = () => {
  const runtime = useMessageRuntime();
  const branchNumber = useMessage((s) => s.branchNumber);
  const branchCount = useMessage((s) => s.branchCount);

  const goToPrev = useCallback(() => {
    runtime.switchToBranch({ position: "previous" });
  }, [runtime]);

  const goToNext = useCallback(() => {
    runtime.switchToBranch({ position: "next" });
  }, [runtime]);

  return { branchNumber, branchCount, goToPrev, goToNext };
};
