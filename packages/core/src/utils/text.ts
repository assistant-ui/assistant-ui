import type { AppendMessage, ThreadMessage } from "../types/message";
import type { TextMessagePart } from "../types/message";

export const getThreadMessageText = (
  message: ThreadMessage | AppendMessage,
) => {
  const textParts = message.content.filter(
    (part) => part.type === "text",
  ) as TextMessagePart[];

  return textParts.map((part) => part.text).join("\n\n");
};
