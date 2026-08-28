import { useCallback } from "react";
import { useAui, useAuiState, type AssistantState } from "@assistant-ui/store";
import { actionBarEditDisabled } from "../../store/primitive-predicates";

export const useActionBarEdit = () => {
  const aui = useAui();
  const disabled = useAuiState("composer", (composer) =>
    actionBarEditDisabled({ composer } as AssistantState),
  );

  const edit = useCallback(() => {
    aui.composer.beginEdit();
  }, [aui]);

  return { edit, disabled };
};
