import type { useAssistant } from "ai/react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { useCachedChunkedMessages } from "../utils/useCachedChunkedMessages";
import { convertMessage } from "../utils/convertMessage";
import { useInputSync } from "../utils/useInputSync";

export const useVercelUseAssistantRuntime = (
  assistantHelpers: ReturnType<typeof useAssistant>,
) => {
  const messages = useCachedChunkedMessages(assistantHelpers.messages);
  const runtime = useExternalStoreRuntime({
    isRunning: assistantHelpers.status === "in_progress",
    messages,
    onCancel: async () => assistantHelpers.stop(),
    onNew: async (message) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text")
        throw new Error(
          "VercelUseAssistantRuntime only supports text content.",
        );

      await assistantHelpers.append({
        role: message.role,
        content: message.content[0].text,
      });
    },
    onNewThread: () => {
      assistantHelpers.messages = [];
      assistantHelpers.input = "";
      assistantHelpers.setMessages([]);
      assistantHelpers.setInput("");
    },
    convertMessage,
  });

  useInputSync(assistantHelpers, runtime);

  return runtime;
};
