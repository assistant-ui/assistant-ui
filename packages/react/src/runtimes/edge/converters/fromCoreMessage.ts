import { generateId } from "../../../internal";
import { ThreadMessage, CoreMessage } from "../../../types";

export const fromCoreMessages = (
  message: readonly CoreMessage[],
): ThreadMessage[] => {
  return message.map((message) => {
    return {
      id: generateId(),
      createdAt: new Date(),
      ...(message.role === "assistant"
        ? {
            status: { type: "done" },
          }
        : undefined),
      ...message,
    } as ThreadMessage;
  });
};
