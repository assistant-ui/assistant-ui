import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "./AssistantCloud";
import { generateThreadTitle } from "./generateThreadTitle";

const titleStream = (...chunks: { type: string; textDelta?: string }[]) =>
  new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const createCloud = (stream: ReadableStream<unknown>) => {
  const update = vi.fn().mockResolvedValue(undefined);
  const run = vi.fn().mockResolvedValue(stream);
  const cloud = {
    threads: { update },
    runs: { stream: run },
  } as unknown as AssistantCloud;
  return { cloud, update, run };
};

describe("generateThreadTitle", () => {
  it("accumulates text deltas and updates the thread title", async () => {
    const { cloud, run, update } = createCloud(
      titleStream(
        { type: "text-delta", textDelta: "Weather " },
        { type: "text-delta", textDelta: "chat" },
      ),
    );

    await expect(
      generateThreadTitle(cloud, {
        threadId: "thread-1",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "What is the weather today?" }],
          },
        ],
      }),
    ).resolves.toBe("Weather chat");

    expect(run).toHaveBeenCalledExactlyOnceWith({
      thread_id: "thread-1",
      assistant_id: "system/thread_title",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "What is the weather today?" }],
        },
      ],
    });
    expect(update).toHaveBeenCalledExactlyOnceWith("thread-1", {
      title: "Weather chat",
    });
  });

  it("returns null without updating when the stream has no text", async () => {
    const { cloud, update } = createCloud(titleStream());

    await expect(
      generateThreadTitle(cloud, {
        threadId: "thread-1",
        messages: [],
      }),
    ).resolves.toBeNull();

    expect(update).not.toHaveBeenCalled();
  });
});
