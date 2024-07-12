import { generateId } from "../../../internal";
import { ThreadMessage, CoreMessage } from "../../../types";

export const fromCoreMessages = (message: CoreMessage[]): ThreadMessage[] => {
  return message.map((message) => {
    return {
      ...message,
      id: generateId(),
      createdAt: new Date(),
      ...(message.role === "assistant"
        ? {
            status: { type: "done" },
          }
        : undefined),
    } as ThreadMessage;
  });
};
