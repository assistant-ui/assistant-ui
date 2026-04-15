import type { ThreadMessage } from "../types/message";
import type { SerializedThreadMessage } from "./types";
import { serializeMessages, isSerializedMessages } from "./serialization";

export type ToJSONOptions = {
  pretty?: boolean;
};

export const toJSON = (
  messages: readonly (ThreadMessage | SerializedThreadMessage)[],
  options?: ToJSONOptions,
): string => {
  const serialized = isSerializedMessages(messages)
    ? messages
    : serializeMessages(messages as readonly ThreadMessage[]);

  return JSON.stringify(serialized, null, options?.pretty ? 2 : undefined);
};
