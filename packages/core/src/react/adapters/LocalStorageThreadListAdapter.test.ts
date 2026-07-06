import { describe, expect, it } from "vitest";
import type { AsyncStorageLike } from "./LocalStorageThreadListAdapter";
import {
  createLocalStorageAdapter,
  parseStoredMessageRepository,
  parseStoredThreadMetadata,
} from "./LocalStorageThreadListAdapter";

const createStorage = (
  entries: Record<string, string> = {},
): AsyncStorageLike & { get(key: string): string | undefined } => {
  const values = new Map(Object.entries(entries));
  return {
    get: (key) => values.get(key),
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
};

describe("parseStoredThreadMetadata", () => {
  it("returns an empty list for invalid JSON", () => {
    expect(parseStoredThreadMetadata("{not-json")).toEqual([]);
  });

  it("skips malformed thread records while preserving valid records", () => {
    const threads = parseStoredThreadMetadata(
      JSON.stringify([
        { remoteId: "thread-1", status: "regular", title: "Trip plan" },
        { remoteId: 123, status: "regular" },
        { remoteId: "thread-2", status: "archived", custom: { pinned: true } },
        { remoteId: "thread-3", status: "deleted" },
      ]),
    );

    expect(threads).toEqual([
      { remoteId: "thread-1", status: "regular", title: "Trip plan" },
      { remoteId: "thread-2", status: "archived", custom: { pinned: true } },
    ]);
  });

  it("defaults old thread records without status to regular", () => {
    expect(
      parseStoredThreadMetadata(JSON.stringify([{ remoteId: "old" }])),
    ).toEqual([{ remoteId: "old", status: "regular" }]);
  });
});

describe("parseStoredMessageRepository", () => {
  it("returns empty history for invalid JSON", () => {
    expect(parseStoredMessageRepository("{not-json")).toEqual({ messages: [] });
  });

  it("skips malformed message records", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        headId: "message-2",
        messages: [
          {
            message: { id: "message-1", role: "user", content: [] },
            parentId: null,
          },
          { message: { role: "user", content: [] }, parentId: null },
          {
            message: { id: "message-2", role: "assistant", content: [] },
            parentId: "message-1",
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "message-1",
      "message-2",
    ]);
    expect(repo.headId).toBe("message-2");
  });

  it("drops a head id that points at a skipped message", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        headId: "missing",
        messages: [
          {
            message: { id: "message-1", role: "user", content: [] },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo).toEqual({
      messages: [
        {
          message: { id: "message-1", role: "user", content: [] },
          parentId: null,
        },
      ],
    });
  });
});

describe("createLocalStorageAdapter", () => {
  it("lists no threads when the stored thread list is invalid JSON", async () => {
    const storage = createStorage({ "@assistant-ui:threads": "{not-json" });
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.list()).resolves.toEqual({ threads: [] });
  });

  it("overwrites malformed thread storage when initializing a thread", async () => {
    const storage = createStorage({ "@assistant-ui:threads": "{not-json" });
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.initialize("thread-1")).resolves.toEqual({
      remoteId: "thread-1",
      externalId: undefined,
    });

    expect(JSON.parse(storage.get("@assistant-ui:threads") ?? "")).toEqual([
      { remoteId: "thread-1", status: "regular" },
    ]);
  });
});
