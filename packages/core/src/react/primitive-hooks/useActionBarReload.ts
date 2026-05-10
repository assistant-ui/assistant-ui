import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarReload = () => {
  const aui = useAui();
  const disabled = useAuiState(
    (s) =>
      s.thread.isRunning ||
      s.thread.isDisabled ||
      s.message.role !== "assistant",
  );

  const reload = useCallback(() => {
    aui.message().reload();
  }, [aui]);

  return { reload, disabled };
};
