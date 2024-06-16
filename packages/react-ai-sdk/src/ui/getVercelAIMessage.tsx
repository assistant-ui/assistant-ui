import type { ThreadMessage } from "@assistant-ui/react/experimental";
import type { Message } from "ai";

export const symbolInnerAIMessage = Symbol("innerVercelAIUIMessage");

export type VercelAIThreadMessage = ThreadMessage & {
  [symbolInnerAIMessage]?: Message[];
};

export const getVercelAIMessage = (message: ThreadMessage) => {
  return (message as VercelAIThreadMessage)[symbolInnerAIMessage];
};
