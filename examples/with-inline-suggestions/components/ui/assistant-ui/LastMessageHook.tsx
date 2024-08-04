import { ThreadAssistantMessage } from "@assistant-ui/react";
import { useThreadContext } from "@assistant-ui/react";

export const useLastAssistantMessage = () => {
  const { useThreadMessages } = useThreadContext();
  return useThreadMessages((messages) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") {
        return messages[i]! as ThreadAssistantMessage;
      }
    }
    return null;
  });
};
