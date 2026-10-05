import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarSpeakDisabled } from "../../store/primitive-predicates";

export const useActionBarSpeak = () => {
  const aui = useAui();

  const disabled = useAuiState(actionBarSpeakDisabled);

  const speak = useCallback(async () => {
    aui.message.speak();
  }, [aui]);

  return { speak, disabled };
};
