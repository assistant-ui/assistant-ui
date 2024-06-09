import type { Message } from "ai";
import type { ThreadMessage } from "../../../utils/AssistantTypes";

export const symbolInnerAIMessage = Symbol("innerVercelAIUIMessage");

export type VercelAIThreadMessage = ThreadMessage & {
  [symbolInnerAIMessage]?: Message;
};

export const getVercelAIMessage = (message: ThreadMessage) => {
  return (message as VercelAIThreadMessage)[symbolInnerAIMessage];
};
