import { useCallback } from "react";
import { useThreadRuntime } from "../context";
import { useThread } from "../hooks/useThread";

export const useComposerCancel = () => {
  const runtime = useThreadRuntime();
  const canCancel = useThread((s) => s.isRunning);

  const cancel = useCallback(() => {
    runtime.cancelRun();
  }, [runtime]);

  return { cancel, canCancel };
};
