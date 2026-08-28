import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarStopSpeaking = () => {
  const aui = useAui();
  const disabled = useAuiState("message", (s) => s.speech == null);

  const stopSpeaking = useCallback(() => {
    aui.message.stopSpeaking();
  }, [aui]);

  return { stopSpeaking, disabled };
};
