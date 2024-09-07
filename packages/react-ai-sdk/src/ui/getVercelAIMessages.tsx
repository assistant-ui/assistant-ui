import {
  getExternalStoreMessage,
  type ThreadMessage,
} from "@assistant-ui/react";
import type { Message } from "ai";

export const getVercelAIMessages = (message: ThreadMessage) => {
  return getExternalStoreMessage(message) as Message[];
};
