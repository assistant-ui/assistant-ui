import type { TextContentPart, ThreadMessage } from "../types/AssistantTypes";

export const getThreadMessageText = (message: ThreadMessage) => {
  const textParts = message.content.filter(
    (part) => part.type === "text",
  ) as TextContentPart[];

  return textParts.map((part) => part.text).join("\n\n");
};
