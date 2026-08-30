import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export const useActionBarSpeak = () => {
  const aui = useAui();

  const message = useAuiState("message");
  const disabled = !(
    (message.role !== "assistant" || message.status?.type !== "running") &&
    message.content.some((c) => c.type === "text" && c.text.length > 0)
  );

  const speak = useCallback(async () => {
    aui.message.speak();
  }, [aui]);

  return { speak, disabled };
};
