import { useCallback } from "react";
import {
  useComposer,
  useComposerRuntime,
} from "../../context/react/ComposerContext";

export const useActionBarEdit = () => {
  const composerRuntime = useComposerRuntime();
  const disabled = useComposer((c) => c.isEditing);

  const callback = useCallback(() => {
    composerRuntime.beginEdit();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
};
