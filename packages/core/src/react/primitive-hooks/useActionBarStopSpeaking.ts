import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarStopSpeaking = () => {
  const aui = useAui();
  const disabled = useAuiState((s) => s.message.speech == null);

  const stopSpeaking = useCallback(() => {
    aui.message().stopSpeaking();
  }, [aui]);

  return { stopSpeaking, disabled };
};
