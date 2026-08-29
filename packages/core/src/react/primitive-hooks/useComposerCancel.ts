import { useCallback } from "react";
import { useAui, useAuiState, type AssistantState } from "@assistant-ui/store";
import { composerCancelDisabled } from "../../store/primitive-predicates";

export const useComposerCancel = () => {
  const aui = useAui();
  const disabled = composerCancelDisabled({
    composer: useAuiState("composer"),
  } as AssistantState);

  const cancel = useCallback(() => {
    aui.composer.cancel();
  }, [aui]);

  return { cancel, disabled };
};
