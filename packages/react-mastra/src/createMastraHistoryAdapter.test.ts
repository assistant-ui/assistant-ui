import type { MastraClient } from "@mastra/client-js";
import type { MessageFormatAdapter } from "@assistant-ui/react";
import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { createMastraHistoryAdapter } from "./createMastraHistoryAdapter";

const formatAdapter: MessageFormatAdapter<
  UIMessage,
  Record<string, unknown>
> = {
  format: "ai-sdk",
  encode: ({ message }) => message,
  decode: ({ content }) => ({
    parentId: null,
    message: content as UIMessage,
  }),
  getId: (message) => message.id,
};

const dbMessage = (id: string, role: "user" | "assistant", text: string) => ({
  id,
  role,
  content: { format: 2, parts: [{ type: "text", text }] },
  createdAt: new Date(),
  threadId: "thread-1",
  resourceId: "user-1",
});

describe("createMastraHistoryAdapter", () => {
  it("loads every page and reconstructs a linear AI SDK repository", async () => {
    const listMessages = vi
      .fn()
      .mockResolvedValueOnce({
        messages: [dbMessage("message-1", "user", "Hello")],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        messages: [dbMessage("message-2", "assistant", "Hi")],
        hasMore: false,
      });
    const client = {
      getMemoryThread: vi.fn(() => ({
        get: vi.fn(async () => ({ resourceId: "user-1" })),
        listMessages,
      })),
    } as unknown as MastraClient;
    const adapter = createMastraHistoryAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
      getThreadId: () => "thread-1",
    }).withFormat!(formatAdapter);

    const repository = await adapter.load();

    expect(listMessages).toHaveBeenNthCalledWith(1, {
      page: 0,
      perPage: 100,
      orderBy: { field: "createdAt", direction: "ASC" },
    });
    expect(listMessages).toHaveBeenNthCalledWith(2, {
      page: 1,
      perPage: 100,
      orderBy: { field: "createdAt", direction: "ASC" },
    });
    expect(repository).toMatchObject({
      headId: "message-2",
      messages: [
        { parentId: null, message: { id: "message-1", role: "user" } },
        {
          parentId: "message-1",
          message: { id: "message-2", role: "assistant" },
        },
      ],
    });
  });

  it("does not load history before a remote thread exists", async () => {
    const client = {
      getMemoryThread: vi.fn(),
    } as unknown as MastraClient;
    const adapter = createMastraHistoryAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
      getThreadId: () => undefined,
    }).withFormat!(formatAdapter);

    await expect(adapter.load()).resolves.toEqual({ messages: [] });
    expect(client.getMemoryThread).not.toHaveBeenCalled();
  });

  it("rejects history from another resource", async () => {
    const listMessages = vi.fn();
    const client = {
      getMemoryThread: vi.fn(() => ({
        get: vi.fn(async () => ({ resourceId: "user-2" })),
        listMessages,
      })),
    } as unknown as MastraClient;
    const adapter = createMastraHistoryAdapter({
      client,
      agentId: "agent-1",
      resourceId: "user-1",
      getThreadId: () => "thread-1",
    }).withFormat!(formatAdapter);

    await expect(adapter.load()).rejects.toThrow(
      "Mastra thread thread-1 does not belong to this resource.",
    );
    expect(listMessages).not.toHaveBeenCalled();
  });
});
