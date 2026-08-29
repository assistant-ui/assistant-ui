import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerDictate = () => {
  const aui = useAui();
  const composer = useAuiState("composer");
  const composerDisabled = composer.dictation != null || !composer.isEditing;
  const dictationSupported = useAuiState("thread").capabilities.dictation;
  const disabled = composerDisabled || !dictationSupported;

  const startDictation = useCallback(() => {
    aui.composer.startDictation();
  }, [aui]);

  return { startDictation, disabled };
};
