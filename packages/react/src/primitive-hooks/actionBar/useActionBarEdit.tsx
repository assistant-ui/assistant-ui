import { useCallback } from "react";
import { useEditComposer, useMessageRuntime } from "../../context";

export const useActionBarEdit = () => {
  const messageRuntime = useMessageRuntime();
  const disabled = useEditComposer((c) => c.isEditing);

  const callback = useCallback(() => {
    messageRuntime.composer.beginEdit();
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};
