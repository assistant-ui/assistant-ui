import type { AssistantCloud } from "./AssistantCloud";

export async function generateThreadTitle(
  cloud: AssistantCloud,
  options: {
    threadId: string;
    messages: readonly {
      role: string;
      content: readonly { type: "text"; text: string }[];
    }[];
  },
): Promise<string | null> {
  const stream = await cloud.runs.stream({
    thread_id: options.threadId,
    assistant_id: "system/thread_title",
    messages: options.messages,
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
    await cloud.threads.update(options.threadId, { title });
  }

  return title || null;
}
