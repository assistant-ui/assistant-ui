import { describe, expect, it } from "vitest";
import type { AsyncStorageLike } from "./LocalStorageThreadListAdapter";
import {
  createLocalStorageAdapter,
  parseStoredMessageRepository,
  parseStoredThreadMetadata,
} from "./LocalStorageThreadListAdapter";
import { mapToolCallPartsDeep } from "../../runtime/utils/tool-call-tree";

const storedMessage = (
  id: string,
  role: "user" | "assistant" | "system" = "user",
) => ({
  id,
  role,
  createdAt: "2026-01-01T00:00:00.000Z",
  content: [],
  metadata: { custom: {} },
  ...(role === "user" ? { attachments: [] } : undefined),
  ...(role === "assistant"
    ? { status: { type: "complete", reason: "stop" } }
    : undefined),
});

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
            message: storedMessage("message-1"),
            parentId: null,
          },
          { message: { role: "user", content: [] }, parentId: null },
          {
            message: storedMessage("message-2", "assistant"),
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
            message: storedMessage("message-1"),
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.headId).toBeUndefined();
    expect(repo.messages.map((item) => item.message.id)).toEqual(["message-1"]);
  });

  it("skips messages missing the required thread message shell", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          { message: { id: "missing-role" }, parentId: null },
          {
            message: {
              ...storedMessage("missing-content"),
              content: undefined,
            },
            parentId: null,
          },
          {
            message: { ...storedMessage("missing-metadata"), metadata: {} },
            parentId: null,
          },
          {
            message: storedMessage("valid"),
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual(["valid"]);
  });

  it("drops unreadable parts without deleting their messages", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("null-part", "assistant"),
              content: [null],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("invalid-text"),
              content: [
                { type: "text", text: 42 },
                { type: "image", image: 42 },
                { type: "file", data: 42, mimeType: "text/plain" },
                { type: "audio", audio: { data: "bytes", format: "ogg" } },
                { type: "data", name: 42, data: {} },
              ],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("tool-call", "assistant"),
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call-1",
                  toolName: "search",
                  args: {},
                },
              ],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "null-part",
      "invalid-text",
      "tool-call",
    ]);
    expect(repo.messages[0]?.message.content).toEqual([]);
    expect(repo.messages[1]?.message.content).toEqual([]);
    expect(repo.messages[2]?.message.content).toEqual([
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
      },
    ]);
  });

  it("preserves system message shells with malformed text content", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("invalid-system", "system"),
              content: [{ type: "text", text: 42 }],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("valid-system", "system"),
              content: [{ type: "text", text: "Follow the instructions" }],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "invalid-system",
      "valid-system",
    ]);
    expect(repo.messages[0]?.message.content).toEqual([
      { type: "text", text: "" },
    ]);
  });

  it("preserves supported user content loaded from storage", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("user-content"),
              content: [
                { type: "text", text: "hello" },
                { type: "image", image: "https://example.com/image.png" },
                {
                  type: "file",
                  data: "SGVsbG8=",
                  mimeType: "text/plain",
                },
                { type: "audio", audio: { data: "bytes", format: "mp3" } },
                { type: "data", name: "weather", data: { sunny: true } },
                { type: "data-legacy", data: { value: 1 } },
              ],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages[0]?.message.content).toEqual([
      { type: "text", text: "hello" },
      { type: "image", image: "https://example.com/image.png" },
      { type: "file", data: "SGVsbG8=", mimeType: "text/plain" },
      { type: "audio", audio: { data: "bytes", format: "mp3" } },
      { type: "data", name: "weather", data: { sunny: true } },
      { type: "data", name: "legacy", data: { value: 1 } },
    ]);
  });

  it("preserves empty assistant text through storage normalization", () => {
    const stored = JSON.stringify({
      messages: [
        {
          message: {
            ...storedMessage("assistant-content", "assistant"),
            content: [
              { type: "text", text: "" },
              { type: "reasoning", text: "  " },
            ],
          },
          parentId: null,
        },
      ],
    });

    const repo = parseStoredMessageRepository(stored);
    expect(repo.messages[0]?.message.content).toEqual([
      { type: "text", text: "" },
      { type: "reasoning", text: "  " },
    ]);
    expect(
      parseStoredMessageRepository(JSON.stringify(repo)).messages[0]?.message
        .content,
    ).toEqual(repo.messages[0]?.message.content);
  });

  it("preserves unknown message parts for forward compatibility", () => {
    const stored = JSON.stringify({
      messages: [
        {
          message: {
            ...storedMessage("user-content"),
            content: [{ type: "future-user-part", value: "user" }],
          },
          parentId: null,
        },
        {
          message: {
            ...storedMessage("assistant-content", "assistant"),
            content: [{ type: "future-assistant-part", value: "assistant" }],
          },
          parentId: "user-content",
        },
      ],
    });

    const repo = parseStoredMessageRepository(stored);
    expect(repo.messages.map((item) => item.message.content)).toEqual([
      [{ type: "future-user-part", value: "user" }],
      [{ type: "future-assistant-part", value: "assistant" }],
    ]);
    expect(
      parseStoredMessageRepository(JSON.stringify(repo)).messages.map(
        (item) => item.message.content,
      ),
    ).toEqual(repo.messages.map((item) => item.message.content));
  });

  it("normalizes nested tool-call data loaded from storage", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("tool-call", "assistant"),
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call-1",
                  toolName: "search",
                  args: {},
                  modelContent: [
                    null,
                    { type: "text", text: "result" },
                    { type: "text", text: 42 },
                    {
                      type: "file",
                      data: "SGVsbG8=",
                      mediaType: "text/plain",
                    },
                    {
                      type: "file",
                      data: 42,
                      mediaType: "text/plain",
                    },
                  ],
                  messages: [
                    null,
                    {
                      ...storedMessage("nested", "assistant"),
                      content: [null],
                    },
                  ],
                },
              ],
            },
            parentId: null,
          },
        ],
      }),
    );

    const message = repo.messages[0]?.message;
    expect(message?.role).toBe("assistant");
    if (message?.role !== "assistant") throw new Error("expected assistant");
    const part = message.content[0];
    expect(part?.type).toBe("tool-call");
    if (part?.type !== "tool-call") throw new Error("expected tool call");
    expect(part.modelContent).toEqual([
      { type: "text", text: "result" },
      {
        type: "file",
        data: "SGVsbG8=",
        mediaType: "text/plain",
      },
    ]);
    expect(part.messages).toEqual([
      {
        ...storedMessage("nested", "assistant"),
        content: [],
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {
          ...storedMessage("nested", "assistant").metadata,
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
        },
      },
    ]);
    expect(() =>
      mapToolCallPartsDeep(message.content, (tool) => tool),
    ).not.toThrow();
  });

  it("bounds nested tool-call message normalization", () => {
    let nestedMessage: unknown = storedMessage("leaf", "assistant");
    for (let depth = 101; depth >= 0; depth -= 1) {
      nestedMessage = {
        ...storedMessage(`nested-${depth}`, "assistant"),
        content: [
          {
            type: "tool-call",
            toolCallId: `call-${depth}`,
            toolName: "delegate",
            args: {},
            messages: [nestedMessage],
          },
        ],
      };
    }

    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [{ message: nestedMessage, parentId: null }],
      }),
    );

    let message = repo.messages[0]?.message;
    let parsedDepth = 0;
    while (message?.role === "assistant") {
      const part = message.content[0];
      if (part?.type !== "tool-call" || !part.messages?.[0]) break;
      parsedDepth += 1;
      message = part.messages[0];
    }
    expect(parsedDepth).toBe(100);
  });

  it("drops malformed attachments and defaults an invalid assistant status", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("attachments"),
              attachments: [
                null,
                {
                  id: "attachment-1",
                  type: "file",
                  name: "notes.txt",
                  status: { type: "complete" },
                  content: [null, { type: "text", text: "notes" }],
                },
              ],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("status", "assistant"),
              status: { type: "complete", reason: "length" },
            },
            parentId: null,
          },
        ],
      }),
    );

    const attachmentMessage = repo.messages[0]?.message;
    expect(attachmentMessage?.role).toBe("user");
    if (attachmentMessage?.role !== "user") throw new Error("expected user");
    expect(attachmentMessage.attachments).toEqual([
      {
        id: "attachment-1",
        type: "file",
        name: "notes.txt",
        status: { type: "complete" },
        content: [{ type: "text", text: "notes" }],
      },
    ]);

    const assistantMessage = repo.messages[1]?.message;
    expect(assistantMessage?.role).toBe("assistant");
    if (assistantMessage?.role !== "assistant")
      throw new Error("expected assistant");
    expect(assistantMessage.status).toEqual({
      type: "complete",
      reason: "unknown",
    });
  });

  it("preserves descendants when only a parent part is malformed", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        headId: "child",
        messages: [
          {
            message: {
              ...storedMessage("parent", "assistant"),
              content: [null],
            },
            parentId: null,
          },
          {
            message: storedMessage("child"),
            parentId: "parent",
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "parent",
      "child",
    ]);
    expect(repo.headId).toBe("child");
  });

  it("skips messages whose parent is missing, skipped, or appears later", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        headId: "child-of-root",
        messages: [
          {
            message: storedMessage("child-of-missing"),
            parentId: "missing",
          },
          {
            message: storedMessage("child-of-invalid"),
            parentId: "invalid",
          },
          {
            message: { id: "invalid" },
            parentId: null,
          },
          {
            message: storedMessage("child-before-parent"),
            parentId: "late-parent",
          },
          {
            message: storedMessage("late-parent"),
            parentId: null,
          },
          {
            message: storedMessage("child-of-root"),
            parentId: "late-parent",
          },
        ],
      }),
    );

    expect(
      repo.messages.map((item) => ({
        id: item.message.id,
        parentId: item.parentId,
      })),
    ).toEqual([
      { id: "late-parent", parentId: null },
      { id: "child-of-root", parentId: "late-parent" },
    ]);
    expect(repo.headId).toBe("child-of-root");
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

  it("preserves concurrent metadata mutations across adapters", async () => {
    const threadsKey = "@assistant-ui:threads";
    const values = new Map<string, string>();
    let metadataReads = 0;
    let metadataWrites = 0;
    let markFirstWriteStarted!: () => void;
    let releaseFirstWrite!: () => void;
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve;
    });
    const firstWriteCanFinish = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const storage: AsyncStorageLike = {
      getItem: async (key) => {
        if (key === threadsKey) metadataReads += 1;
        return values.get(key) ?? null;
      },
      setItem: async (key, value) => {
        if (key === threadsKey) {
          metadataWrites += 1;
          if (metadataWrites === 1) {
            markFirstWriteStarted();
            await firstWriteCanFinish;
          }
        }
        values.set(key, value);
      },
      removeItem: async (key) => {
        values.delete(key);
      },
    };
    const firstAdapter = createLocalStorageAdapter({ storage });
    const secondAdapter = createLocalStorageAdapter({ storage });

    const firstInitialization = firstAdapter.initialize("thread-1");
    await firstWriteStarted;
    const secondInitialization = secondAdapter.initialize("thread-2");
    const readsWhileFirstWritePending = metadataReads;

    releaseFirstWrite();
    await Promise.all([firstInitialization, secondInitialization]);

    expect(readsWhileFirstWritePending).toBe(1);
    expect(JSON.parse(values.get(threadsKey) ?? "")).toEqual([
      { remoteId: "thread-2", status: "regular" },
      { remoteId: "thread-1", status: "regular" },
    ]);
  });

  it("continues processing mutations after a storage failure", async () => {
    const threadsKey = "@assistant-ui:threads";
    const values = new Map<string, string>();
    let shouldFail = true;
    const storage: AsyncStorageLike = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error("Storage unavailable");
        }
        values.set(key, value);
      },
      removeItem: async (key) => {
        values.delete(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.initialize("thread-1")).rejects.toThrow(
      "Storage unavailable",
    );
    await expect(adapter.initialize("thread-2")).resolves.toEqual({
      remoteId: "thread-2",
      externalId: undefined,
    });

    expect(JSON.parse(values.get(threadsKey) ?? "")).toEqual([
      { remoteId: "thread-2", status: "regular" },
    ]);
  });

  it("includes the thread id when a stored thread cannot be fetched", async () => {
    const storage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
    });
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.fetch("missing-thread")).rejects.toThrow(
      'Stored thread "missing-thread" not found while fetching thread metadata.',
    );
  });
});
