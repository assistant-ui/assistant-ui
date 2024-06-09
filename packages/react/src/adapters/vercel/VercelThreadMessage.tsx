import type { Message } from "ai";
import type { ThreadMessage } from "../../utils/AssistantTypes";

export const symbolInnerMessage = Symbol("innerMessage");
export const symbolInnerRSCMessage = Symbol("innerRSCMessage");

export type VercelThreadMessage = ThreadMessage & {
  [symbolInnerMessage]?: Message;
};

export type VercelRSCThreadMessage<T> = ThreadMessage & {
  [symbolInnerRSCMessage]?: T;
};

export const getVercelMessage = (message: ThreadMessage) => {
  return (message as VercelThreadMessage)[symbolInnerMessage];
};

export const getVercelRSCMessage = <T,>(message: ThreadMessage) => {
  return (message as VercelRSCThreadMessage<T>)[symbolInnerRSCMessage];
};
