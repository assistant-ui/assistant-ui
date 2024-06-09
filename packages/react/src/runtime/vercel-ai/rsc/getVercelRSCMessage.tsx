import type { ThreadMessage } from "../../../utils/AssistantTypes";

export const symbolInnerRSCMessage = Symbol("innerVercelRSCMessage");

export type VercelRSCThreadMessage<T> = ThreadMessage & {
  [symbolInnerRSCMessage]?: T;
};

export const getVercelRSCMessage = <T,>(message: ThreadMessage) => {
  return (message as VercelRSCThreadMessage<T>)[symbolInnerRSCMessage];
};
