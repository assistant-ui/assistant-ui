import { useCallback } from "react";
import { useComposerContext } from "../../context";

export const useComposerSend = () => {
  const { useComposer } = useComposerContext();

  const disabled = useComposer((c) => !c.isEditing || c.value.length === 0);

  const callback = useCallback(() => {
    const { send } = useComposer.getState();
    send();
  }, [useComposer]);

  if (disabled) return null;
  return callback;
};
