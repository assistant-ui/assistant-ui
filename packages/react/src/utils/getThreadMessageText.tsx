import type {
  AppendMessage,
  TextContentPart,
  ThreadMessage,
} from "../types/AssistantTypes";

export const getThreadMessageText = (
  message: ThreadMessage | AppendMessage,
) => {
  const textParts = message.content.filter(
    (part) => part.type === "text",
  ) as TextContentPart[];

  return textParts.map((part) => part.text).join("\n\n");
};
