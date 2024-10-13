import { useCallback } from "react";
import { useComposer, useComposerRuntime } from "../../context";

export const useComposerCancel = () => {
  const composerRuntime = useComposerRuntime();
  const disabled = useComposer((c) => !c.canCancel);

  const callback = useCallback(() => {
    composerRuntime.cancel();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
};
