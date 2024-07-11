import { ThreadMessage, CoreMessage } from "../../../types";

export const toCoreMessage = (message: ThreadMessage): CoreMessage => {
  return {
    role: message.role,
    content: message.content.map((part) => {
      if (part.type === "ui") throw new Error("UI parts are not supported");
      return part;
    }),
  } as CoreMessage;
};
