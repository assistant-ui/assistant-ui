import { useCallback } from "react";
import { useComposer, useComposerStore } from "../../context";

export const useComposerCancel = () => {
  const composerStore = useComposerStore();
  const disabled = useComposer((c) => !c.canCancel);

  const callback = useCallback(() => {
    const { cancel } = composerStore.getState();
    cancel();
  }, [composerStore]);

  if (disabled) return null;
  return callback;
};
