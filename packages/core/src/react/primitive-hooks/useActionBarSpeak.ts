import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarSpeak = () => {
  const aui = useAui();

  const disabled = useAuiState((s) => {
    return !(
      s.optional.thread?.capabilities.speech === true &&
      (s.message.role !== "assistant" ||
        s.message.status?.type !== "running") &&
      s.message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const speak = useCallback(() => {
    aui.message.speak();
  }, [aui]);

  return { speak, disabled };
};
