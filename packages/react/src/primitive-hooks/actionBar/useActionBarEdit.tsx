import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarEdit = () => {
  const { useMessage, useEditComposer } = useMessageContext();

  const disabled = useCombinedStore(
    [useMessage, useEditComposer],
    (m, c) => m.message.role !== "user" || c.isEditing,
  );

  const callback = useCallback(() => {
    const { edit } = useEditComposer.getState();
    edit();
  }, [useEditComposer]);

  if (disabled) return null;
  return callback;
};
