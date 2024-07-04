import { useCallback } from "react";
import { useComposerContext } from "../../context";

export const useComposerCancel = () => {
  const { useComposer } = useComposerContext();

  const disabled = useComposer((c) => !c.canCancel);

  const callback = useCallback(() => {
    const { cancel } = useComposer.getState();
    cancel();
  }, [useComposer]);

  if (disabled) return null;
  return callback;
};
