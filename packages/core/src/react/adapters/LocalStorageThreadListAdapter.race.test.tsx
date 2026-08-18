// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AsyncStorageLike } from "./LocalStorageThreadListAdapter";

const mocks = vi.hoisted(() => ({
  aui: undefined as unknown,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => mocks.aui,
}));

import { createLocalStorageAdapter } from "./LocalStorageThreadListAdapter";

const storedMessage = {
  id: "message-1",
  role: "user" as const,
  content: [],
  attachments: [],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  metadata: { custom: {} },
};

describe("createLocalStorageAdapter history races", () => {
  it("does not restore a thread from a history append during deletion", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const values = new Map<string, string>([
      [
        threadsKey,
        JSON.stringify([{ remoteId: "thread-1", status: "regular" }]),
      ],
      [messagesKey, JSON.stringify({ messages: [] })],
    ]);
    let markMetadataDeleted!: () => void;
    let releaseMessageRemoval!: () => void;
    const metadataDeleted = new Promise<void>((resolve) => {
      markMetadataDeleted = resolve;
    });
    const messageRemovalReleased = new Promise<void>((resolve) => {
      releaseMessageRemoval = resolve;
    });
    const storage: AsyncStorageLike = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        values.set(key, value);
        if (key === threadsKey && JSON.parse(value).length === 0) {
          markMetadataDeleted();
        }
      },
      removeItem: async (key) => {
        if (key === messagesKey) await messageRemovalReleased;
        values.delete(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    mocks.aui = {
      threadListItem: {
        getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
        initialize: () => adapter.initialize("thread-1"),
      },
    };
    const { result } = renderHook(() => adapter.unstable_useAdapters!());

    const deletion = adapter.delete("thread-1");
    await metadataDeleted;
    const append = result.current.history!.append({
      parentId: null,
      message: storedMessage,
    });

    await act(async () => {
      await append;
      releaseMessageRemoval();
      await deletion;
    });

    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    expect(values.has(messagesKey)).toBe(false);
  });

  it("allows history appends after a deletion fails", async () => {
    const threadsKey = "@assistant-ui:threads";
    const values = new Map<string, string>([
      [
        threadsKey,
        JSON.stringify([{ remoteId: "thread-1", status: "regular" }]),
      ],
    ]);
    let failDeletion = true;
    const storage: AsyncStorageLike = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        if (key === threadsKey && failDeletion) {
          failDeletion = false;
          throw new Error("storage unavailable");
        }
        values.set(key, value);
      },
      removeItem: async (key) => {
        values.delete(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    mocks.aui = {
      threadListItem: {
        getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
        initialize: () => adapter.initialize("thread-1"),
      },
    };
    const { result } = renderHook(() => adapter.unstable_useAdapters!());

    await expect(adapter.delete("thread-1")).rejects.toThrow(
      "storage unavailable",
    );
    await result.current.history!.append({
      parentId: null,
      message: storedMessage,
    });

    expect(
      JSON.parse(values.get("@assistant-ui:messages:thread-1") ?? ""),
    ).toMatchObject({ headId: "message-1" });
  });
});
