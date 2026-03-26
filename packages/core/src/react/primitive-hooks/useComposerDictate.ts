import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerDictate = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      s.composer.dictation != null ||
      !s.thread.capabilities.dictation ||
      !s.composer.isEditing,
  );

  const startDictation = useCallback(() => {
    aui.composer().startDictation();
  }, [aui]);

  return { startDictation, disabled };
};
