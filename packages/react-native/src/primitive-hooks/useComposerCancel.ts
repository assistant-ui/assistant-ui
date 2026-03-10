import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerCancel = () => {
  const aui = useAui();
  const canCancel = useAuiState((s) => s.thread.isRunning);

  const cancel = useCallback(() => {
    aui.composer().cancel();
  }, [aui]);

  return { cancel, canCancel };
};
