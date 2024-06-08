import { useCallback } from "react";
import { useCombinedStore } from "../utils/context/combined/useCombinedStore";
import { useMessageContext } from "../utils/context/useMessageContext";

export const useBeginMessageEdit = () => {
  const { useMessage, useComposer } = useMessageContext();

  const disabled = useCombinedStore(
    [useMessage, useComposer],
    (m, c) => m.message.role !== "user" || c.isEditing,
  );
  if (disabled) return null;

  return useCallback(() => {
    const { edit } = useComposer.getState();
    edit();
  }, [useComposer]);
};
