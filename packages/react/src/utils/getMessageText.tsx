import type { TextContentPart, ThreadMessage } from "./AssistantTypes";

export const getMessageText = (message: ThreadMessage) => {
  const textParts = message.content.filter(
    (part) => part.type === "text",
  ) as TextContentPart[];

  return textParts.map((part) => part.text).join("\n\n");
};
