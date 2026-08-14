import {
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";
import type { UIMessage } from "ai";

export const getVercelAIMessages = <UI_MESSAGE extends UIMessage = UIMessage>(
  message: ThreadMessage,
) => {
  return getExternalStoreMessages(message) as UI_MESSAGE[];
};
