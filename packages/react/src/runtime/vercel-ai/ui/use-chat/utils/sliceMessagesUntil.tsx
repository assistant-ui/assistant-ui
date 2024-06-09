import type { Message } from "ai";

export const sliceMessagesUntil = (
  messages: Message[],
  messageId: string | null,
) => {
  if (messageId == null) return [];

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1)
    throw new Error(
      "useVercelAIThreadState: Message not found. This is liekly an internal bug in assistant-ui.",
    );

  return messages.slice(0, messageIdx + 1);
};
