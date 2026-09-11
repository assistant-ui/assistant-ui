import {
  generateThreadTitle as generateCloudThreadTitle,
  type AssistantCloud,
} from "assistant-cloud";
import { MESSAGE_FORMAT } from "../chat/MessagePersistence";

const TITLE_MESSAGE_PAGE_SIZE = 200;

export async function generateThreadTitle(
  cloud: AssistantCloud,
  threadId: string,
): Promise<string | null> {
  // Recent writes can lag behind thread creation, so retry briefly.
  const loadFirstPage = async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { messages } = await cloud.threads.messages.list(threadId, {
        limit: TITLE_MESSAGE_PAGE_SIZE,
      });
      if (messages.length > 0) return messages;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const { messages } = await cloud.threads.messages.list(threadId, {
      limit: TITLE_MESSAGE_PAGE_SIZE,
    });
    return messages;
  };

  let page = await loadFirstPage();
  const loadedMessages: typeof page = [];
  const seen = new Set<string>();
  while (true) {
    const last = page.at(-1);
    if (!last) break;
    const fresh = page.filter((message) => !seen.has(message.id));
    if (fresh.length === 0) break;
    for (const message of fresh) seen.add(message.id);
    loadedMessages.push(...fresh);
    if (page.length < TITLE_MESSAGE_PAGE_SIZE) break;
    ({ messages: page } = await cloud.threads.messages.list(threadId, {
      limit: TITLE_MESSAGE_PAGE_SIZE,
      after: last.id,
    }));
  }

  // Pages arrive newest-first; walk to the opening exchange and reverse only
  // the oldest 200 messages so the title input is bounded and chronological.
  const messages = loadedMessages.slice(-TITLE_MESSAGE_PAGE_SIZE).reverse();
  if (messages.length === 0) return null;

  const aiSdkMessages = messages.filter(
    (msg) =>
      msg.format === MESSAGE_FORMAT ||
      (msg.content && Array.isArray(msg.content.parts)),
  );
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
