import { useCallback } from "react";
import { useAui, useAuiState, type AssistantState } from "@assistant-ui/store";
import { actionBarReloadDisabled } from "../../store/primitive-predicates";

export const useActionBarReload = () => {
  const aui = useAui();
  const thread = useAuiState("thread");
  const message = useAuiState("message");
  const disabled = actionBarReloadDisabled({
    thread,
    message,
  } as AssistantState);

  const reload = useCallback(() => {
    aui.message.reload();
  }, [aui]);

  return { reload, disabled };
};
