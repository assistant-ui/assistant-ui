import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerSend = () => {
  const aui = useAui();
  const canSend = useAuiState((s) => !s.composer.isEmpty);

  const send = useCallback(() => {
    aui.composer().send();
  }, [aui]);

  return { send, canSend };
};
