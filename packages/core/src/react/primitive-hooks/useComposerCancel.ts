import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useComposerCancel = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => !s.composer.canCancel);

  const cancel = useCallback(() => {
    aui.composer().cancel();
  }, [aui]);

  return { cancel, disabled };
};
