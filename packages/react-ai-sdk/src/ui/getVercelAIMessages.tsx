import {
  getExternalStoreMessage,
  type ThreadMessage,
} from "@assistant-ui/react";
import type { Message } from "@ai-sdk/ui-utils";

export const getVercelAIMessages = (message: ThreadMessage) => {
  return getExternalStoreMessage(message) as Message[];
};
