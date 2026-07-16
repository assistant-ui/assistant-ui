import type { MastraClient } from "@mastra/client-js";
import { AssistantMessageStream } from "assistant-stream";
import { describe, expect, it, vi } from "vitest";
import { createMastraThreadListAdapter } from "./createMastraThreadListAdapter";

const makeThread = (overrides: Record<string, unknown> = {}) => ({
  id: "thread-1",
  resourceId: "user-1",
  title: "Hello",
  metadata: { category: "support" },
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  ...overrides,
});

const makeClient = () => {
  let storedThread = makeThread();
  const get = vi.fn(async () => storedThread);
  const update = vi.fn(async (input) => {
    storedThread = makeThread({ ...storedThread, ...input });
    return storedThread;
  });
  const deleteThread = vi.fn(async () => ({ result: "deleted" }));
  const listMessages = vi.fn(async () => ({
    messages: [],
    total: 0,
    page: 0,
    perPage: 100,
    hasMore: false,
  }));
  const memoryThread = {
    get,
    update,
    delete: deleteThread,
    listMessages,
  };
  const client = {
    listMemoryThreads: vi.fn(async () => ({
      threads: [makeThread()],
      total: 1,
      page: 0,
      perPage: 50,
      hasMore: false,
    })),
    createMemoryThread: vi.fn(async (input) =>
      makeThread({ ...input, id: input.threadId }),
    ),
    getMemoryThread: vi.fn(() => memoryThread),
  } as unknown as MastraClient;
  return { client, get, update, deleteThread };
};

describe("createMastraThreadListAdapter", () => {
  it("lists and creates resource-scoped Mastra threads", async () => {
    const { client } = makeClient();
    const adapter = createMastraThreadListAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
      metadata: { tenant: "acme" },
    });

    await expect(adapter.list()).resolves.toEqual({
      threads: [
        expect.objectContaining({
          status: "regular",
          remoteId: "thread-1",
          title: "Hello",
          custom: { category: "support" },
        }),
      ],
      nextCursor: undefined,
    });
    await expect(adapter.initialize("thread-2")).resolves.toEqual({
      remoteId: "thread-2",
      externalId: undefined,
    });
    expect(client.createMemoryThread).toHaveBeenCalledWith({
      agentId: "agent-1",
      resourceId: "user-1",
      threadId: "thread-2",
      metadata: { tenant: "acme", assistantUiStatus: "regular" },
    });
  });

  it("stores archive state alongside custom Mastra metadata", async () => {
    const { client, update } = makeClient();
    const adapter = createMastraThreadListAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
    });

    await adapter.archive("thread-1");

    expect(update).toHaveBeenCalledWith({
      title: "Hello",
      resourceId: "user-1",
      metadata: {
        category: "support",
        assistantUiStatus: "archived",
      },
    });
  });

  it("persists and streams a deterministic title", async () => {
    const { client, update } = makeClient();
    const adapter = createMastraThreadListAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
    });
    const stream = await adapter.generateTitle("thread-1", [
      {
        id: "message-1",
        role: "user",
        createdAt: new Date(),
        content: [{ type: "text", text: "Summarize the quarterly results" }],
        attachments: [],
        metadata: {},
      },
    ]);
    let title = "";
    for await (const message of AssistantMessageStream.fromAssistantStream(
      stream,
    )) {
      title = message.parts.find((part) => part.type === "text")?.text ?? "";
    }

    expect(title).toBe("Summarize the quarterly results");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Summarize the quarterly results" }),
    );
  });

  it("serializes metadata mutations for the same thread", async () => {
    const { client, get, update } = makeClient();
    const adapter = createMastraThreadListAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
    });

    await Promise.all([
      adapter.archive("thread-1"),
      adapter.updateCustom("thread-1", { priority: "high" }),
    ]);

    expect(get).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith({
      title: "Hello",
      resourceId: "user-1",
      metadata: {
        priority: "high",
        assistantUiStatus: "archived",
      },
    });
  });

  it("rejects mutations and fetches for another resource", async () => {
    const { client, get, update, deleteThread } = makeClient();
    get.mockResolvedValue(
      makeThread({ resourceId: "user-2" }) as Awaited<ReturnType<typeof get>>,
    );
    const adapter = createMastraThreadListAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
    });

    await expect(adapter.rename("thread-1", "Denied")).rejects.toThrow(
      "Mastra thread thread-1 does not belong to this resource.",
    );
    await expect(adapter.fetch("thread-1")).rejects.toThrow(
      "Mastra thread thread-1 does not belong to this resource.",
    );
    await expect(adapter.delete("thread-1")).rejects.toThrow(
      "Mastra thread thread-1 does not belong to this resource.",
    );
    expect(update).not.toHaveBeenCalled();
    expect(deleteThread).not.toHaveBeenCalled();
  });
});
