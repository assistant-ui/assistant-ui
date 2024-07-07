import { useThreadContext } from "@assistant-ui/react";
import { useMemo } from "react";

export const useLastAssistantMessage = () => {
  const { useThreadMessages } = useThreadContext();
  const messages = useThreadMessages();

  return useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i];
      }
    }
    return null;
  }, [messages]);
};