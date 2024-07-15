import { ThreadMessage, CoreMessage } from "../../../types";

export const toCoreMessages = (message: ThreadMessage[]): CoreMessage[] => {
  return message.map(toCoreMessage);
};

export const toCoreMessage = (message: ThreadMessage): CoreMessage => {
  const role = message.role;
  switch (role) {
    case "assistant":
      return {
        role,
        content: message.content.map((part) => {
          if (part.type === "ui") throw new Error("UI parts are not supported");
          if (part.type === "tool-call") {
            const { argsText, ...rest } = part;
            return rest;
          }
          return part;
        }),
      };

    case "user":
      return {
        role,
        content: message.content.map((part) => {
          if (part.type === "ui") throw new Error("UI parts are not supported");
          return part;
        }),
      };

    case "system":
      return {
        role,
        content: message.content,
      };

    default: {
      const unsupportedRole: never = role;
      throw new Error(`Unknown message role: ${unsupportedRole}`);
    }
  }
};
