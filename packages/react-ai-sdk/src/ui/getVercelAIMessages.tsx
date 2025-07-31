import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/react";
import type { UIMessage } from "ai";

export const getVercelAIMessages = (message: ThreadMessage) => {
  return getExternalStoreMessages(message) as UIMessage[];
};
