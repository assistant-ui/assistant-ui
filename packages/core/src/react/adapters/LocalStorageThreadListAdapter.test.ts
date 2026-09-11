import { describe, expect, it } from "vitest";
import type { AsyncStorageLike } from "./LocalStorageThreadListAdapter";
import {
  createLocalStorageAdapter,
  parseStoredMessageRepository,
  parseStoredThreadMetadata,
} from "./LocalStorageThreadListAdapter";

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

  it("drops malformed parts without dropping their messages", () => {
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
              content: [{ type: "text", text: 42 }],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("invalid-nested-message", "assistant"),
              content: [
                {
                  type: "tool-call",
                  toolCallId: "tool-1",
                  toolName: "delegate",
                  args: {},
                  argsText: "{}",
                  messages: [null],
                },
              ],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("invalid-generative-ui", "assistant"),
              content: [{ type: "generative-ui", spec: {} }],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("invalid-optional-fields", "assistant"),
              content: [
                { type: "text", text: "safe", status: null },
                {
                  type: "file",
                  data: "aGVsbG8=",
                  mimeType: "text/plain",
                  filename: 42,
                },
              ],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("valid"),
              content: [{ type: "text", text: "hello" }],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "null-part",
      "invalid-text",
      "invalid-nested-message",
      "invalid-generative-ui",
      "invalid-optional-fields",
      "valid",
    ]);
    expect(repo.messages[0]?.message.content).toEqual([]);
    expect(repo.messages[1]?.message.content).toEqual([]);
    expect(repo.messages[2]?.message.content).toEqual([
      expect.objectContaining({ messages: [] }),
    ]);
    expect(repo.messages[3]?.message.content).toEqual([]);
    expect(repo.messages[4]?.message.content).toEqual([]);
  });

  it("normalizes malformed attachments, statuses, and metadata", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("invalid-attachment"),
              attachments: [null],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("invalid-status", "assistant"),
              status: { type: "complete", reason: "length" },
              metadata: {
                custom: {},
                steps: [
                  null,
                  { messageId: "step-1" },
                  { messageId: 42 },
                  { usage: { inputTokens: 1, outputTokens: "bad" } },
                ],
                timing: { streamStartTime: "bad" },
              },
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("null-attachments"),
              attachments: null,
            },
            parentId: null,
          },
          {
            message: storedMessage("valid", "assistant"),
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "invalid-attachment",
      "invalid-status",
      "null-attachments",
      "valid",
    ]);
    expect(repo.messages[0]?.message.attachments).toEqual([]);
    expect(repo.messages[1]?.message).toMatchObject({
      status: { type: "complete", reason: "unknown" },
      metadata: { steps: [{ messageId: "step-1" }] },
    });
    expect(repo.messages[1]?.message.metadata.timing).toBeUndefined();
    expect(repo.messages[2]?.message.attachments).toEqual([]);
  });

  it("preserves supported content and attachment fields", () => {
    const nestedMessage = storedMessage("nested");
    const content = [
      {
        type: "source",
        sourceType: "document",
        id: "source-1",
        title: "Reference",
        mediaType: "text/plain",
        filename: "reference.txt",
        providerMetadata: { provider: { sourceId: "provider-source" } },
        parentId: "group-1",
        status: { type: "complete", reason: "unknown" },
      },
      { type: "generative-ui", spec: { root: "Hello" }, id: "ui-1" },
      {
        type: "file",
        data: "aGVsbG8=",
        mimeType: "text/plain",
        filename: "hello.txt",
        sourceType: "id",
        providerMetadata: { provider: { fileId: "provider-file" } },
        parentId: "group-1",
        status: { type: "complete", reason: "unknown" },
      },
      { type: "data", name: "empty" },
      {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "delegate",
        state: "result",
        status: { type: "complete", reason: "unknown" },
        args: { task: "review" },
        argsText: '{"task":"review"}',
        result: false,
        approval: { id: "approval-1", approved: true },
        mcp: { app: { resourceUri: "ui://result" } },
        providerMetadata: { provider: { traceId: "trace-1" } },
        messages: [nestedMessage],
      },
    ];
    const attachment = {
      id: "attachment-1",
      type: "file",
      name: "notes.txt",
      contentType: "text/plain",
      status: { type: "complete" },
      content: [{ type: "text", text: "notes" }],
    };
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("assistant", "assistant"),
              content,
              metadata: {
                custom: {},
                steps: [
                  {
                    messageId: "assistant",
                    usage: { inputTokens: 4, outputTokens: 5 },
                  },
                ],
                timing: {
                  streamStartTime: 1,
                  firstTokenTime: 2,
                  totalStreamTime: 3,
                  tokenCount: 4,
                  tokensPerSecond: 5,
                  totalChunks: 6,
                  toolCallCount: 7,
                },
              },
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("user"),
              attachments: [attachment],
            },
            parentId: "assistant",
          },
        ],
      }),
    );

    expect(repo.messages).toHaveLength(2);
    expect(repo.messages[0]?.message.content).toMatchObject([
      ...content.slice(0, 4),
      {
        ...content[4],
        messages: [
          {
            ...nestedMessage,
            createdAt: new Date(nestedMessage.createdAt),
          },
        ],
      },
    ]);
    expect(repo.messages[1]?.message.attachments).toEqual([attachment]);
    expect(repo.messages[0]?.message.metadata).toMatchObject({
      steps: [
        {
          messageId: "assistant",
          usage: { inputTokens: 4, outputTokens: 5 },
        },
      ],
      timing: {
        streamStartTime: 1,
        firstTokenTime: 2,
        totalStreamTime: 3,
        tokenCount: 4,
        tokensPerSecond: 5,
        totalChunks: 6,
        toolCallCount: 7,
      },
    });
    const toolCall = repo.messages[0]?.message.content[4];
    expect(toolCall).toMatchObject({
      type: "tool-call",
      result: false,
      messages: [expect.objectContaining({ id: "nested" })],
    });
    if (toolCall?.type === "tool-call") {
      expect(toolCall.messages?.[0]?.createdAt).toBeInstanceOf(Date);
    }
  });

  it("preserves descendants of system messages with malformed content", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("system", "system"),
              content: [
                {
                  type: "text",
                  text: "instructions",
                  status: { type: "incomplete", reason: "tool-calls" },
                },
              ],
            },
            parentId: null,
          },
          {
            message: storedMessage("user"),
            parentId: "system",
          },
        ],
      }),
    );

    expect(repo.messages.map((item) => item.message.id)).toEqual([
      "system",
      "user",
    ]);
    expect(repo.messages[0]?.message.content).toEqual([
      { type: "text", text: "" },
    ]);
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
