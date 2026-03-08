import type { ThreadMessage } from "../../types";

export const symbolInnerMessage = Symbol("innerMessage");
const symbolInnerMessages = Symbol("innerMessages");

type WithInnerMessages<T> = {
  [symbolInnerMessage]?: T | T[];
  [symbolInnerMessages]?: T[];
};

/**
 * @deprecated Use `getExternalStoreMessages` (plural) instead. This function will be removed in 0.12.0.
 */
export const getExternalStoreMessage = <T>(input: ThreadMessage) => {
  const withInnerMessages = input as WithInnerMessages<T>;
  return withInnerMessages[symbolInnerMessage];
};

const EMPTY_ARRAY: never[] = [];

/**
 * Attach the original external store message(s) to a ThreadMessage or message part.
 * This is a no-op if the target already has a bound message.
 * Use `getExternalStoreMessages` to retrieve the bound messages later.
 *
 * @deprecated This API is experimental and may change without notice.
 */
export const bindExternalStoreMessage = <T>(
  target: object,
  message: T | T[],
): void => {
  if (symbolInnerMessage in target) return;
  (target as WithInnerMessages<T>)[symbolInnerMessage] = message;
};

export const getExternalStoreMessages = <T>(
  input:
    | { messages: readonly ThreadMessage[] }
    | ThreadMessage
    | ThreadMessage["content"][number],
) => {
  const container = (
    "messages" in input ? input.messages : input
  ) as WithInnerMessages<T>;
  const value = container[symbolInnerMessages] || container[symbolInnerMessage];
  if (!value) return EMPTY_ARRAY;
  if (Array.isArray(value)) {
    return value;
  }
  container[symbolInnerMessages] = [value];
  return container[symbolInnerMessages];
};
