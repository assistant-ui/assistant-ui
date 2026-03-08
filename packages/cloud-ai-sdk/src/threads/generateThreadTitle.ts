import type { AssistantCloud } from "assistant-cloud";
import { MESSAGE_FORMAT } from "../chat/MessagePersistence";

export async function generateThreadTitle(
  cloud: AssistantCloud,
  threadId: string,
): Promise<string | null> {
  // Recent writes can lag behind thread creation, so retry briefly.
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

  const aiSdkMessages = messages.filter(
    (msg) =>
      msg.format === MESSAGE_FORMAT ||
      (msg.content && Array.isArray(msg.content["parts"])),
  );
  if (aiSdkMessages.length === 0) return null;

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

  if (title) {
    await cloud.threads.update(threadId, { title });
  }

  return title || null;
}
