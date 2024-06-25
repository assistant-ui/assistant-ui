import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarEdit = () => {
  const { useMessage, useComposer } = useMessageContext();

  const disabled = useCombinedStore(
    [useMessage, useComposer],
    (m, c) => m.message.role !== "user" || c.isEditing,
  );

  const callback = useCallback(() => {
    const { edit } = useComposer.getState();
    edit();
  }, [useComposer]);

  if (disabled) return null;
  return callback;
};
