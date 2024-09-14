import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";

export const useActionBarEdit = () => {
  const { useEditComposer } = useMessageContext();

  const disabled = useEditComposer((c) => c.isEditing);

  const callback = useCallback(() => {
    const { edit } = useEditComposer.getState();
    edit();
  }, [useEditComposer]);

  if (disabled) return null;
  return callback;
};
