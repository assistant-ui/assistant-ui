import { ThreadMessage } from "../../types";

export const symbolInnerMessage = Symbol("innerMessage");

export type ExternalStoreThreadMessage<T> = ThreadMessage & {
  [symbolInnerMessage]?: T;
};

export const getExternalStoreMessage = <T,>(message: ThreadMessage) => {
  return (message as ExternalStoreThreadMessage<T>)[symbolInnerMessage];
};
