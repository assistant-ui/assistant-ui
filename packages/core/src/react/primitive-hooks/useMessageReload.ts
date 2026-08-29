import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useMessageReload = () => {
  const aui = useAui();
  const canReload = useAuiState("message").role === "assistant";

  const reload = useCallback(() => {
    aui.message.reload();
  }, [aui]);

  return { reload, canReload };
};
