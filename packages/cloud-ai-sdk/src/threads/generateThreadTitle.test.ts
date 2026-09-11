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

const createCloud = (messages: ReturnType<typeof cloudMessage>[]) => {
  const list = vi.fn(
    async (_threadId: string, query?: { limit?: number; after?: string }) => {
      const start = query?.after
        ? messages.findIndex((message) => message.id === query.after) + 1
        : 0;
      return { messages: messages.slice(start, start + (query?.limit ?? 200)) };
    },
  );
  const update = vi.fn().mockResolvedValue(undefined);
  const stream = vi.fn(
    async (_options: Parameters<AssistantCloud["runs"]["stream"]>[0]) =>
      titleStream("Weather chat"),
  );
  const cloud = {
    threads: { messages: { list }, update },
    runs: { stream },
  } as unknown as AssistantCloud;
  return { cloud, list, update, stream };
};

describe("generateThreadTitle", () => {
  it("feeds the title model the conversation in chronological order", async () => {
    const { cloud, list, stream, update } = createCloud([
      cloudMessage("m2", "assistant", "Sunny with light wind."),
      cloudMessage("m1", "user", "What is the weather today?"),
    ]);

    const title = await generateThreadTitle(cloud, "thread-1");

    expect(title).toBe("Weather chat");
    expect(list).toHaveBeenCalledExactlyOnceWith("thread-1", { limit: 200 });
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

  it("titles a long thread from its oldest 200 messages", async () => {
    const messages = Array.from({ length: 450 }, (_, index) => {
      const id = 450 - index;
      return cloudMessage(
        `m${id}`,
        id % 2 ? "user" : "assistant",
        `Message m${id}`,
      );
    });
    const { cloud, list, stream } = createCloud(messages);

    expect(await generateThreadTitle(cloud, "thread-1")).toBe("Weather chat");

    expect(list.mock.calls).toEqual([
      ["thread-1", { limit: 200 }],
      ["thread-1", { limit: 200, after: "m251" }],
      ["thread-1", { limit: 200, after: "m51" }],
    ]);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream.mock.calls[0]![0].messages).toEqual(
      Array.from({ length: 200 }, (_, index) => ({
        role: index % 2 ? "assistant" : "user",
        content: [{ type: "text", text: `Message m${index + 1}` }],
      })),
    );
  });

  it("retries an empty first page before generating a title", async () => {
    vi.useFakeTimers();
    try {
      const { cloud, list, stream } = createCloud([
        cloudMessage("m1", "user", "Hello"),
      ]);
      list.mockResolvedValueOnce({ messages: [] });

      const title = generateThreadTitle(cloud, "thread-1");
      await vi.advanceTimersByTimeAsync(300);

      expect(await title).toBe("Weather chat");
      expect(stream).toHaveBeenCalledTimes(1);
      expect(list.mock.calls).toEqual([
        ["thread-1", { limit: 200 }],
        ["thread-1", { limit: 200 }],
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops when a cursor replays already-seen messages", async () => {
    const messages = Array.from({ length: 200 }, (_, index) =>
      cloudMessage(`m${200 - index}`, "user", `Message m${200 - index}`),
    );
    const { cloud, list, stream } = createCloud(messages);
    list
      .mockResolvedValueOnce({ messages })
      .mockResolvedValueOnce({ messages });

    expect(await generateThreadTitle(cloud, "thread-1")).toBe("Weather chat");
    expect(list.mock.calls).toEqual([
      ["thread-1", { limit: 200 }],
      ["thread-1", { limit: 200, after: "m1" }],
    ]);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream.mock.calls[0]![0].messages).toHaveLength(200);
  });
});
