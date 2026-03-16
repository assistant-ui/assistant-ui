import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerSend = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) => s.thread.isRunning || !s.composer.isEditing || s.composer.isEmpty,
  );

  const send = useCallback(() => {
    aui.composer().send();
  }, [aui]);

  return { send, disabled };
};
