import type { Message } from "ai";
import type { ThreadMessage } from "../../../utils/AssistantTypes";

export const symbolInnerAIMessage = Symbol("innerMessage");
export const symbolInnerRSCMessage = Symbol("innerRSCMessage");

export type VercelAIThreadMessage = ThreadMessage & {
  [symbolInnerAIMessage]?: Message;
};

export type VercelRSCThreadMessage<T> = ThreadMessage & {
  [symbolInnerRSCMessage]?: T;
};

export const getVercelAIMessage = (message: ThreadMessage) => {
  return (message as VercelAIThreadMessage)[symbolInnerAIMessage];
};

export const getVercelRSCMessage = <T,>(message: ThreadMessage) => {
  return (message as VercelRSCThreadMessage<T>)[symbolInnerRSCMessage];
};
