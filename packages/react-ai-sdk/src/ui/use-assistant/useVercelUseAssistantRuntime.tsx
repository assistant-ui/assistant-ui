import type { useAssistant } from "ai/react";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { convertMessage } from "../utils/convertMessage";
import { useInputSync } from "../utils/useInputSync";
import { toCreateMessage } from "../utils/toCreateMessage";
import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";

export const useVercelUseAssistantRuntime = (
  assistantHelpers: ReturnType<typeof useAssistant>,
) => {
  const messages = useExternalMessageConverter({
    callback: convertMessage,
    isRunning: assistantHelpers.status === "in_progress",
    messages: assistantHelpers.messages,
  });
  const runtime = useExternalStoreRuntime({
    isRunning: assistantHelpers.status === "in_progress",
    messages,
    onCancel: async () => assistantHelpers.stop(),
    onNew: async (message) => {
      await assistantHelpers.append(await toCreateMessage(message));
    },
    onSwitchToNewThread: () => {
      assistantHelpers.messages = [];
      assistantHelpers.input = "";
      assistantHelpers.setMessages([]);
      assistantHelpers.setInput("");
    },
    adapters: {
      attachments: vercelAttachmentAdapter,
    },
  });

  useInputSync(assistantHelpers, runtime);

  return runtime;
};
