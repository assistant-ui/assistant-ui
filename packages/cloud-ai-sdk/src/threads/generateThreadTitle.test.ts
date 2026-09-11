import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import { generateThreadTitle } from "./generateThreadTitle";
import { MESSAGE_FORMAT } from "../chat/MessagePersistence";

const cloudMessage = (id: string, role: string, text: string) => ({
  id,
  format: MESSAGE_FORMAT,
  content: { role, parts: [{ type: "text", text }] },
});

const titleStream = (title: string) =>
  new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "text-delta", textDelta: title });
      controller.close();
    },
  });

const createCloud = (messages: unknown[]) => {
  const list = vi.fn().mockResolvedValue({ messages });
  const update = vi.fn().mockResolvedValue(undefined);
  const stream = vi.fn().mockResolvedValue(titleStream("Weather chat"));
  const cloud = {
    threads: { messages: { list }, update },
    runs: { stream },
  } as unknown as AssistantCloud;
  return { cloud, list, update, stream };
};

describe("generateThreadTitle", () => {
  it("feeds the title model the conversation in chronological order", async () => {
    const { cloud, stream, update } = createCloud([
      cloudMessage("m2", "assistant", "Sunny with light wind."),
      cloudMessage("m1", "user", "What is the weather today?"),
    ]);

    const title = await generateThreadTitle(cloud, "thread-1");

    expect(title).toBe("Weather chat");
    expect(stream).toHaveBeenCalledExactlyOnceWith({
      thread_id: "thread-1",
      assistant_id: "system/thread_title",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "What is the weather today?" }],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "Sunny with light wind." }],
        },
      ],
    });
    expect(update).toHaveBeenCalledExactlyOnceWith("thread-1", {
      title: "Weather chat",
    });
  });
});
