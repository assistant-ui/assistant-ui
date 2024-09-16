import { useCallback } from "react";
import {
  useEditComposer,
  useEditComposerStore,
} from "../../context/react/MessageContext";

export const useActionBarEdit = () => {
  const editComposerStore = useEditComposerStore();
  const disabled = useEditComposer((c) => c.isEditing);

  const callback = useCallback(() => {
    const { edit } = editComposerStore.getState();
    edit();
  }, [useEditComposer]);

  if (disabled) return null;
  return callback;
};
