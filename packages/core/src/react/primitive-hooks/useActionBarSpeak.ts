import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarSpeak = () => {
  const aui = useAui();

  const disabled = useAuiState("message", (s) => {
    return !(
      (s.role !== "assistant" || s.status?.type !== "running") &&
      s.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const speak = useCallback(async () => {
    aui.message.speak();
  }, [aui]);

  return { speak, disabled };
};
