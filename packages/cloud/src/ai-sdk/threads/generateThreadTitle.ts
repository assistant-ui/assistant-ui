import type { AssistantCloud } from "../../AssistantCloud";
import { MESSAGE_FORMAT } from "../chat/messageFormat";

/**
 * Generate a title for a thread using AI.
 * Loads messages from cloud and uses the built-in title generation assistant.
 *
 * @param cloud - The AssistantCloud instance
 * @param threadId - The thread ID to generate a title for
 * @returns The generated title, or null if generation failed
 */
export async function generateThreadTitle(
  cloud: AssistantCloud,
  threadId: string,
): Promise<string | null> {
  // Load messages with retry (messages may not be persisted yet)
  const loadMessages = async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { messages } = await cloud.threads.messages.list(threadId);
      if (messages.length > 0) return messages;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const { messages } = await cloud.threads.messages.list(threadId);
    return messages;
  };

  const messages = await loadMessages();
  if (messages.length === 0) return null;

  // Filter to ai-sdk/v6 format messages (have content.parts array)
  const aiSdkMessages = messages.filter(
    (msg) =>
      msg.format === MESSAGE_FORMAT ||
      (msg.content && Array.isArray(msg.content["parts"])),
  );
  if (aiSdkMessages.length === 0) return null;

  // Convert to title generator format (text parts only)
  const convertedMessages = aiSdkMessages
    .map((msg) => {
      const parts = msg.content["parts"] as
        | Array<{ type: string; text?: string }>
        | undefined;
      if (!parts) return null;
      const textParts = parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => ({ type: "text" as const, text: part.text! }));
      if (textParts.length === 0) return null;
      return {
        role: msg.content["role"] as string,
        content: textParts,
      };
    })
    .filter((msg): msg is NonNullable<typeof msg> => msg !== null);

  if (convertedMessages.length === 0) return null;

  // Stream title from cloud's built-in title generation assistant
  const stream = await cloud.runs.stream({
    thread_id: threadId,
    assistant_id: "system/thread_title",
    messages: convertedMessages,
  });

  let title = "";
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      if (chunk.type === "text-delta") {
        title += chunk.textDelta;
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Persist the title if generated
  if (title) {
    await cloud.threads.update(threadId, { title });
  }

  return title || null;
}
