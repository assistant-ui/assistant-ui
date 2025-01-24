import { ThreadMessage } from "../../types";

export const symbolInnerMessage = Symbol("innerMessage");

export type ExternalStoreThreadMessage<T> = ThreadMessage & {
  [symbolInnerMessage]?: T;
};

export type ExternalStoreThreadMessages<T> = ThreadMessage & {
  [symbolInnerMessage]?: T[];
};

/**
 * @deprecated Use `getExternalStoreMessages` (plural) instead. This function will be removed in 0.8.0.
 */
export const getExternalStoreMessage = <T,>(
  message: ThreadMessage | ThreadMessage["content"],
) => {
  return (message as ExternalStoreThreadMessage<T>)[symbolInnerMessage];
};

export const getExternalStoreMessages = <T,>(
  message: ThreadMessage | ThreadMessage["content"],
) => {
  // TODO temp until 0.8.0 (migrate useExternalStoreRuntime to always set an array)
  const value = (message as ExternalStoreThreadMessages<T>)[symbolInnerMessage];
  if (!value) return []
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};
