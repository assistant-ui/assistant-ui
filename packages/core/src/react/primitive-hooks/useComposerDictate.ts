import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerDictate = () => {
  const aui = useAui();
  const composerDisabled = useAuiState(
    "composer",
    (s) => s.dictation != null || !s.isEditing,
  );
  const dictationSupported = useAuiState(
    "thread",
    (s) => s.capabilities.dictation,
  );
  const disabled = composerDisabled || !dictationSupported;

  const startDictation = useCallback(() => {
    aui.composer.startDictation();
  }, [aui]);

  return { startDictation, disabled };
};
