import { useCallback } from "react";
import { useComposerRuntime } from "../hooks/useComposerRuntime";
import { useComposer } from "../hooks/useComposer";

export const useComposerCancel = () => {
  const runtime = useComposerRuntime();
  const canCancel = useComposer((state) => state.canCancel);

  const cancel = useCallback(() => {
    if (!canCancel) return;
    runtime.cancel();
  }, [runtime, canCancel]);

  return { cancel, canCancel };
};
