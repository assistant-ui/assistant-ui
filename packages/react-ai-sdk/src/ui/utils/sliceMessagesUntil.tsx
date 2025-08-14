import type { UIMessage } from "ai";

export const sliceMessagesUntil = <UI_MESSAGE extends UIMessage = UIMessage>(
  messages: UI_MESSAGE[],
  messageId: string | null,
) => {
  if (messageId == null) return [];

  let messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1)
    throw new Error(
      "useVercelAIThreadState: Message not found. This is likely an internal bug in assistant-ui.",
    );

  while (messages[messageIdx + 1]?.role === "assistant") {
    messageIdx++;
  }

  return messages.slice(0, messageIdx + 1);
};
