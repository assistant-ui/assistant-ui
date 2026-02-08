import type { UIMessage } from "ai";
import { getToolName, isToolUIPart } from "ai";

/**
 * Find the tool name from messages by toolCallId
 */
export const getToolFromMessages = (
  messages: UIMessage[],
  toolCallId: string,
): string | null => {
  for (const msg of messages) {
    if (msg.role !== "assistant" || !msg.parts) continue;
    for (const part of msg.parts) {
      if (isToolUIPart(part) && part.toolCallId === toolCallId) {
        return getToolName(part);
      }
    }
  }
  return null;
};
