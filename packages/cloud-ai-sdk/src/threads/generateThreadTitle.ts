import {
  CloudMessagePersistence,
  generateThreadTitle as generateCloudThreadTitle,
  type AssistantCloud,
} from "assistant-cloud";
import { MESSAGE_FORMAT } from "../chat/MessagePersistence";

const TITLE_MESSAGE_LIMIT = 200;

export async function generateThreadTitle(
  cloud: AssistantCloud,
  threadId: string,
): Promise<string | null> {
  // `load` walks every page of the thread by cursor; the id mapping it fills
  // on this throwaway instance is unused.
  const persistence = new CloudMessagePersistence(cloud);

  // Recent writes can lag behind thread creation, so retry briefly.
  const loadMessages = async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const messages = await persistence.load(threadId);
      if (messages.length > 0) return messages;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return persistence.load(threadId);
  };

  // Pages arrive newest-first; filter first so a thread whose opening rows
  // are in another format still titles, then keep the oldest usable messages
  // in chronological order.
  const aiSdkMessages = (await loadMessages())
    .filter(
      (msg) =>
        msg.format === MESSAGE_FORMAT ||
        (msg.content && Array.isArray(msg.content.parts)),
    )
    .slice(-TITLE_MESSAGE_LIMIT)
    .reverse();
  if (aiSdkMessages.length === 0) return null;

  const convertedMessages = aiSdkMessages
    .map((msg) => {
      const parts = msg.content.parts as
        | Array<{ type: string; text?: string }>
        | undefined;
      if (!parts) return null;
      const textParts = parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => ({ type: "text" as const, text: part.text! }));
      if (textParts.length === 0) return null;
      return {
        role: msg.content.role as string,
        content: textParts,
      };
    })
    .filter((msg): msg is NonNullable<typeof msg> => msg !== null);

  if (convertedMessages.length === 0) return null;

  return generateCloudThreadTitle(cloud, {
    threadId,
    messages: convertedMessages,
  });
}
