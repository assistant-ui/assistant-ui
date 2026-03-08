import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useEditComposerSend = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.composer.isEmpty);

  const send = useCallback(() => {
    aui.composer().send();
  }, [aui]);

  return { send, disabled };
};
