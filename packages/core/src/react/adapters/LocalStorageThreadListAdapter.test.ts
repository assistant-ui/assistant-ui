import { describe, expect, it } from "vitest";
import type {
  MessageFormatAdapter,
  ThreadHistoryAdapter,
} from "../../adapters/thread-history";
import type { AsyncStorageLike } from "./LocalStorageThreadListAdapter";
import {
  createLocalStorageAdapter,
  createLocalStorageHistoryAdapter,
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

const createHistory = (storage: AsyncStorageLike, getAui: () => never) =>
  createLocalStorageHistoryAdapter(storage, getAui, "@assistant-ui:");

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

  it("preserves modality on user and assistant messages", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("voice-user"),
              metadata: { modality: "voice", custom: {} },
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("voice-assistant", "assistant"),
              metadata: { modality: "voice", custom: {} },
            },
            parentId: "voice-user",
          },
        ],
      }),
    );

    expect(
      repo.messages.map(({ message }) => message.metadata.modality),
    ).toEqual(["voice", "voice"]);
  });

  it("restores submitted feedback with and without a comment", () => {
    const assistant = (id: string, submittedFeedback: unknown) => ({
      message: {
        ...storedMessage(id, "assistant"),
        metadata: { submittedFeedback, custom: {} },
      },
      parentId: null,
    });
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          assistant("commented", {
            type: "negative",
            comment: "Quoted the wrong date",
          }),
          assistant("legacy", { type: "positive" }),
          assistant("blank", { type: "positive", comment: "" }),
          assistant("invalid", { type: "neutral", comment: "ignored" }),
        ],
      }),
    );

    expect(
      repo.messages.map(({ message }) => message.metadata.submittedFeedback),
    ).toStrictEqual([
      { type: "negative", comment: "Quoted the wrong date" },
      { type: "positive" },
      { type: "positive" },
      undefined,
    ]);
  });

  it("omits modality when it is missing, unsupported, or on a system message", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("system", "system"),
              content: [{ type: "text", text: "Be brief" }],
              metadata: { modality: "voice", custom: {} },
            },
            parentId: null,
          },
          { message: storedMessage("typed-user"), parentId: "system" },
          {
            message: {
              ...storedMessage("video-assistant", "assistant"),
              metadata: { modality: "video", custom: {} },
            },
            parentId: "typed-user",
          },
        ],
      }),
    );

    expect(
      repo.messages.map(({ message }) => "modality" in message.metadata),
    ).toEqual([false, false, false]);
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

  it("normalizes malformed assistant status and step metadata", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("assistant", "assistant"),
              status: { type: "__proto__" },
              metadata: {
                custom: {},
                steps: [
                  null,
                  {},
                  {
                    messageId: 42,
                    usage: { inputTokens: 7, outputTokens: 8 },
                  },
                  { usage: { inputTokens: 1, outputTokens: 2 } },
                  { usage: { inputTokens: 1 } },
                  { usage: { promptTokens: 3, completionTokens: 4 } },
                  { usage: { inputTokenDetails: { cacheReadTokens: 5 } } },
                  { usage: "invalid" },
                ],
              },
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages[0]?.message.status).toEqual({
      type: "complete",
      reason: "unknown",
    });
    expect(repo.messages[0]?.message.metadata.steps).toEqual([
      {},
      { usage: { inputTokens: 7, outputTokens: 8 } },
      { usage: { inputTokens: 1, outputTokens: 2 } },
      { usage: { inputTokens: 1 } },
      { usage: { promptTokens: 3, completionTokens: 4 } },
      { usage: { inputTokenDetails: { cacheReadTokens: 5 } } },
      {},
    ]);
  });

  it("preserves provider-defined assistant status reasons", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("assistant", "assistant"),
              status: { type: "incomplete", reason: "max_tokens" },
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages[0]?.message.status).toEqual({
      type: "incomplete",
      reason: "max_tokens",
    });
  });

  it("drops unreadable parts and attachments while keeping their messages", () => {
    const attachment = {
      id: "attachment-1",
      type: "document",
      name: "notes.txt",
      status: { type: "complete" },
      content: [null, { type: "text", text: "notes" }],
    };
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        headId: "answer",
        messages: [
          {
            message: {
              ...storedMessage("question"),
              content: [
                null,
                "text",
                { type: 1 },
                { type: "text", text: "hi" },
              ],
              attachments: [
                null,
                attachment,
                { ...attachment, id: 2 },
                { ...attachment, id: "uploading", status: { type: "running" } },
                { ...attachment, id: "no-content", content: undefined },
                { ...attachment, id: "no-name", name: undefined },
              ],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("answer", "assistant"),
              content: [null, { type: "future-part", value: 1 }],
            },
            parentId: "question",
          },
        ],
      }),
    );

    const [question, answer] = repo.messages.map((item) => item.message);
    expect(repo.headId).toBe("answer");
    expect(question?.content).toEqual([{ type: "text", text: "hi" }]);
    expect(question?.attachments).toEqual([
      { ...attachment, content: [{ type: "text", text: "notes" }] },
    ]);
    expect(answer?.content).toEqual([{ type: "future-part", value: 1 }]);
  });

  it("keeps an attachment part type it does not know", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        headId: "question",
        messages: [
          {
            message: {
              ...storedMessage("question"),
              attachments: [
                {
                  id: "attachment-1",
                  type: "document",
                  name: "notes.txt",
                  status: { type: "complete" },
                  content: [{ type: "future-part", value: 1 }],
                },
              ],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages[0]?.message.attachments?.[0]?.content).toEqual([
      { type: "future-part", value: 1 },
    ]);
  });

  it("drops known parts that are missing a required field", () => {
    const parts = {
      text: { type: "text", text: "hi" },
      reasoning: { type: "reasoning", text: "because" },
      summary: { type: "reasoning", unstable_summary: "Searching the docs" },
      image: { type: "image", image: "https://example.com/a.png" },
      file: { type: "file", data: "SGk=", mimeType: "text/plain" },
      audio: { type: "audio", audio: { data: "SGk=", format: "mp3" } },
      data: { type: "data", name: "weather", data: { sunny: true } },
      url: {
        type: "source",
        sourceType: "url",
        id: "source-1",
        url: "https://example.com",
      },
      document: {
        type: "source",
        sourceType: "document",
        id: "source-2",
        title: "Notes",
        mediaType: "text/plain",
      },
      generativeUI: { type: "generative-ui", spec: { root: "hi" } },
      toolCall: {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
      },
    };
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("assistant", "assistant"),
              content: [
                { type: "text" },
                { ...parts.reasoning, text: 1 },
                { type: "image" },
                { ...parts.file, mimeType: undefined },
                { type: "audio", audio: null },
                { type: "data", data: {} },
                { ...parts.url, url: undefined },
                { ...parts.document, sourceType: "unknown" },
                { type: "generative-ui" },
                { ...parts.toolCall, argsText: undefined },
                ...Object.values(parts),
              ],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages[0]?.message.content).toEqual(Object.values(parts));
  });

  it("applies the same rules to nested tool call messages", () => {
    const toolCall = {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "delegate",
      args: {},
      argsText: "{}",
    };
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("parent", "assistant"),
              content: [
                {
                  ...toolCall,
                  messages: [
                    null,
                    { id: "missing-shell" },
                    {
                      ...storedMessage("nested", "assistant"),
                      content: [null, { type: "text", text: "nested" }],
                    },
                  ],
                },
                { ...toolCall, toolCallId: "call-2", messages: "invalid" },
              ],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(repo.messages[0]?.message.content).toEqual([
      {
        ...toolCall,
        messages: [
          {
            ...storedMessage("nested", "assistant"),
            content: [{ type: "text", text: "nested" }],
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            metadata: {
              unstable_state: null,
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          },
        ],
      },
      { ...toolCall, toolCallId: "call-2" },
    ]);
  });

  it("keeps a system message when exactly one readable part remains", () => {
    const repo = parseStoredMessageRepository(
      JSON.stringify({
        messages: [
          {
            message: {
              ...storedMessage("unreadable", "system"),
              content: [null],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("non-text", "system"),
              content: [
                { type: "text" },
                { type: "image", image: "https://example.com/a.png" },
              ],
            },
            parentId: null,
          },
          {
            message: {
              ...storedMessage("recovered", "system"),
              content: [null, { type: "text", text: "Be brief." }],
            },
            parentId: null,
          },
        ],
      }),
    );

    expect(
      repo.messages.map(({ message }) => [message.id, message.content]),
    ).toEqual([
      ["non-text", [{ type: "image", image: "https://example.com/a.png" }]],
      ["recovered", [{ type: "text", text: "Be brief." }]],
    ]);
  });

  it("stops parsing nested tool call messages past the depth limit", () => {
    let stored: unknown = storedMessage("leaf", "assistant");
    for (let level = 0; level < 150; level += 1) {
      stored = {
        ...storedMessage(`level-${level}`, "assistant"),
        content: [
          {
            type: "tool-call",
            toolCallId: `call-${level}`,
            toolName: "delegate",
            args: {},
            argsText: "{}",
            messages: [stored],
          },
        ],
      };
    }

    const repo = parseStoredMessageRepository(
      JSON.stringify({ messages: [{ message: stored, parentId: null }] }),
    );

    let message = repo.messages[0]?.message;
    let depth = 0;
    while (message?.role === "assistant") {
      const part = message.content[0];
      const nested =
        part?.type === "tool-call" ? part.messages?.[0] : undefined;
      if (!nested) break;
      message = nested;
      depth += 1;
    }
    expect(depth).toBe(100);
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
  it("persists history for a newly initialized thread", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: undefined }),
            initialize: () => adapter.initialize("thread-1"),
          },
        }) as never,
    );

    await history.append({
      message: {
        ...storedMessage("first-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);

    expect(
      parseStoredMessageRepository(storage.get(messagesKey) ?? null).messages,
    ).toHaveLength(1);
  });

  it("updates an earlier message without moving the history head", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
      [messagesKey]: JSON.stringify({
        headId: "follow-up",
        messages: [
          {
            message: storedMessage("answer", "assistant"),
            parentId: null,
          },
          { message: storedMessage("follow-up"), parentId: "answer" },
        ],
      }),
    });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await history.update?.({
      message: {
        ...storedMessage("answer", "assistant"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {
          submittedFeedback: { type: "positive" },
          custom: {},
        },
      },
      parentId: null,
    } as never);

    const repo = parseStoredMessageRepository(storage.get(messagesKey) ?? null);
    expect(repo.headId).toBe("follow-up");
    expect(
      repo.messages.find(({ message }) => message.id === "answer")?.message
        .metadata.submittedFeedback,
    ).toEqual({ type: "positive" });
  });

  it("persists concurrent appends that share initialization", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const baseStorage = createStorage();
    let releaseInitialization!: () => void;
    let markInitializationStarted!: () => void;
    const initializationStarted = new Promise<void>((resolve) => {
      markInitializationStarted = resolve;
    });
    const initializationCanFinish = new Promise<void>((resolve) => {
      releaseInitialization = resolve;
    });
    const storage: AsyncStorageLike & {
      get(key: string): string | undefined;
    } = {
      ...baseStorage,
      setItem: async (key, value) => {
        if (key === threadsKey) {
          markInitializationStarted();
          await initializationCanFinish;
        }
        await baseStorage.setItem(key, value);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    const initialization = adapter.initialize("thread-1");
    await initializationStarted;
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: undefined }),
            initialize: () => initialization,
          },
        }) as never,
    );

    const first = history.append({
      message: storedMessage("first-message"),
      parentId: null,
    } as never);
    const second = history.append({
      message: storedMessage("second-message"),
      parentId: "first-message",
    } as never);

    releaseInitialization();
    await Promise.all([first, second]);

    expect(
      parseStoredMessageRepository(
        storage.get(messagesKey) ?? null,
      ).messages.map(({ message }) => message.id),
    ).toEqual(["first-message", "second-message"]);
  });

  it("does not restore history after deletion finishes during initialization", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const baseStorage = createStorage({
      [messagesKey]: JSON.stringify({
        messages: [{ message: storedMessage("old-message"), parentId: null }],
      }),
    });
    let releaseInitialization!: () => void;
    let markInitializationStarted!: () => void;
    const initializationStarted = new Promise<void>((resolve) => {
      markInitializationStarted = resolve;
    });
    const initializationCanFinish = new Promise<void>((resolve) => {
      releaseInitialization = resolve;
    });
    let metadataWrites = 0;
    const storage: AsyncStorageLike & {
      get(key: string): string | undefined;
    } = {
      ...baseStorage,
      setItem: async (key, value) => {
        if (key === threadsKey && metadataWrites++ === 0) {
          markInitializationStarted();
          await initializationCanFinish;
        }
        await baseStorage.setItem(key, value);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: undefined }),
            initialize: () => adapter.initialize("thread-1"),
          },
        }) as never,
    );

    const append = history.append({
      message: {
        ...storedMessage("late-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);
    await initializationStarted;
    const deletion = adapter.delete("thread-1");

    releaseInitialization();
    await Promise.all([append, deletion]);

    expect(storage.get(messagesKey)).toBeUndefined();
  });

  it("does not write history from a deleted thread runtime", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
    });
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await adapter.delete("thread-1");
    await history.append({
      message: storedMessage("orphaned-message"),
      parentId: null,
    } as never);

    expect(storage.get(messagesKey)).toBeUndefined();
  });

  it("does not write history for a record the thread list parser rejects", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "deleted" },
      ]),
    });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await history.append({
      message: storedMessage("orphaned-message"),
      parentId: null,
    } as never);

    expect(storage.get(messagesKey)).toBeUndefined();
  });

  it("persists appends from an open thread when the thread list is unreadable", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage({ "@assistant-ui:threads": "{not-json" });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await history.append({
      message: storedMessage("kept-message"),
      parentId: null,
    } as never);

    expect(
      parseStoredMessageRepository(storage.get(messagesKey) ?? null).messages,
    ).toHaveLength(1);
  });

  it("persists appends from an open thread when the thread list is missing", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage();
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await history.append({
      message: storedMessage("kept-message"),
      parentId: null,
    } as never);

    expect(
      parseStoredMessageRepository(storage.get(messagesKey) ?? null).messages,
    ).toHaveLength(1);
  });

  it("allows history writes after the same thread id is initialized again", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const storage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
    });
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({
              id: "thread-1",
              remoteId: "thread-1",
            }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await adapter.delete("thread-1");
    await adapter.initialize("thread-1");
    await history.append({
      message: {
        ...storedMessage("new-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);

    expect(
      parseStoredMessageRepository(storage.get(messagesKey) ?? null).messages,
    ).toHaveLength(1);
  });

  it("keeps history active when metadata deletion fails", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const baseStorage = createStorage({
      [threadsKey]: JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
    });
    let failMetadataWrite = true;
    const storage: AsyncStorageLike & {
      get(key: string): string | undefined;
    } = {
      ...baseStorage,
      setItem: async (key, value) => {
        if (key === threadsKey && failMetadataWrite) {
          failMetadataWrite = false;
          throw new Error("Storage unavailable");
        }
        await baseStorage.setItem(key, value);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({
              id: "thread-1",
              remoteId: "thread-1",
            }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await expect(adapter.delete("thread-1")).rejects.toThrow(
      "Storage unavailable",
    );
    await history.append({
      message: {
        ...storedMessage("retained-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);

    expect(
      parseStoredMessageRepository(storage.get(messagesKey) ?? null).messages,
    ).toHaveLength(1);
    await expect(
      createLocalStorageAdapter({ storage: { ...storage } }).list(),
    ).resolves.toMatchObject({
      threads: [{ remoteId: "thread-1", status: "regular" }],
    });
  });

  it("keeps an in-flight append when metadata deletion fails", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const baseStorage = createStorage({
      [threadsKey]: JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
    });
    let rejectMetadataWrite!: (error: Error) => void;
    let markMetadataWriteStarted!: () => void;
    const metadataWriteStarted = new Promise<void>((resolve) => {
      markMetadataWriteStarted = resolve;
    });
    const storage: AsyncStorageLike & {
      get(key: string): string | undefined;
    } = {
      ...baseStorage,
      setItem: async (key, value) => {
        if (key === threadsKey) {
          markMetadataWriteStarted();
          await new Promise<void>((_resolve, reject) => {
            rejectMetadataWrite = reject;
          });
        }
        await baseStorage.setItem(key, value);
      },
    };
    let resolveInitialization!: (value: {
      remoteId: string;
      externalId: undefined;
    }) => void;
    const initialization = new Promise<{
      remoteId: string;
      externalId: undefined;
    }>((resolve) => {
      resolveInitialization = resolve;
    });
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: () => initialization,
          },
        }) as never,
    );

    const append = history.append({
      message: storedMessage("retained-message"),
      parentId: null,
    } as never);
    const deletion = adapter.delete("thread-1");
    await metadataWriteStarted;
    resolveInitialization({ remoteId: "thread-1", externalId: undefined });
    await Promise.resolve();
    rejectMetadataWrite(new Error("Storage unavailable"));

    await expect(deletion).rejects.toThrow("Storage unavailable");
    await append;
    expect(
      parseStoredMessageRepository(storage.get(messagesKey) ?? null).messages,
    ).toHaveLength(1);
  });

  it("completes deletion and retries failed cleanup before reinitializing", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const baseStorage = createStorage({
      [threadsKey]: JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
      [messagesKey]: JSON.stringify({
        messages: [{ message: storedMessage("old-message"), parentId: null }],
      }),
    });
    let failCleanup = true;
    const storage: AsyncStorageLike & {
      get(key: string): string | undefined;
    } = {
      ...baseStorage,
      removeItem: async (key) => {
        if (key === messagesKey && failCleanup) {
          throw new Error("Storage unavailable");
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    const history = createHistory(
      storage,
      () =>
        ({
          threadListItem: {
            getState: () => ({ id: "thread-1", remoteId: "thread-1" }),
            initialize: async () => ({
              remoteId: "thread-1",
              externalId: undefined,
            }),
          },
        }) as never,
    );

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    expect((await adapter.list()).threads).toEqual([]);
    expect(storage.get(messagesKey)).toBeDefined();
    await expect(adapter.initialize("thread-1")).rejects.toThrow(
      "Storage unavailable",
    );
    expect((await adapter.list()).threads).toEqual([]);
    failCleanup = false;
    await adapter.initialize("thread-1");
    await history.append({
      message: storedMessage("new-message"),
      parentId: null,
    } as never);

    expect(
      parseStoredMessageRepository(
        storage.get(messagesKey) ?? null,
      ).messages.map(({ message }) => message.id),
    ).toEqual(["new-message"]);
  });

  it("drains pending deletion keys after recreating the storage wrapper", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const formattedKey =
      '@assistant-ui:formatted-messages:["thread-1","test/v1"]';
    const pendingDeletionsKey = "@assistant-ui:pending-thread-deletions";
    const values = new Map([
      [
        threadsKey,
        JSON.stringify([
          { remoteId: "thread-1", status: "regular", formats: ["test/v1"] },
        ]),
      ],
      [messagesKey, JSON.stringify({ messages: [] })],
      [formattedKey, JSON.stringify({ messages: [] })],
    ]);
    const createStorage = (
      failFormattedRemoval: boolean,
    ): AsyncStorageLike & {
      get(key: string): string | undefined;
    } => ({
      get: (key) => values.get(key),
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => {
        values.set(key, value);
      },
      removeItem: async (key) => {
        if (key === formattedKey && failFormattedRemoval) {
          throw new Error("Storage unavailable");
        }
        values.delete(key);
      },
    });
    const adapter = createLocalStorageAdapter({
      storage: createStorage(true),
    });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    expect(values.has(messagesKey)).toBe(false);
    expect(JSON.parse(values.get(threadsKey) ?? "null")).toEqual([]);
    expect(values.has(formattedKey)).toBe(true);

    const reloadedAdapter = createLocalStorageAdapter({
      storage: createStorage(false),
    });
    await expect(reloadedAdapter.list()).resolves.toEqual({ threads: [] });

    expect(values.has(formattedKey)).toBe(false);
    expect(values.has(pendingDeletionsKey)).toBe(false);
  });

  it("keeps initialize, delete, and list usable with malformed pending deletions", async () => {
    const pendingDeletionsKey = "@assistant-ui:pending-thread-deletions";
    const messagesKey = "@assistant-ui:messages:thread-1";
    for (const malformed of [
      "{not-json",
      JSON.stringify({ remoteId: "thread-1", keys: [messagesKey] }),
      JSON.stringify([{ remoteId: "thread-1", keys: [] }]),
      JSON.stringify([
        { remoteId: "orphan", keys: ["@assistant-ui:messages:orphan"] },
        { remoteId: "thread-1", keys: [42] },
      ]),
    ]) {
      const storage = createStorage({
        "@assistant-ui:threads": JSON.stringify([
          { remoteId: "thread-1", status: "regular" },
        ]),
        [messagesKey]: JSON.stringify({ messages: [] }),
        [pendingDeletionsKey]: malformed,
      });
      const adapter = createLocalStorageAdapter({ storage });

      await expect(adapter.initialize("thread-2")).resolves.toEqual({
        remoteId: "thread-2",
        externalId: undefined,
      });
      await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
      await expect(adapter.list()).resolves.toMatchObject({
        threads: [{ remoteId: "thread-2", status: "regular" }],
      });
      expect(storage.get(messagesKey)).toBeUndefined();
    }
  });

  it("retries pending cleanup on a later list with the same adapter", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const pendingDeletionsKey = "@assistant-ui:pending-thread-deletions";
    const baseStorage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
      ]),
      [messagesKey]: JSON.stringify({ messages: [] }),
    });
    let failCleanup = true;
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (key === messagesKey && failCleanup) {
          throw new Error("Storage unavailable");
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    expect(storage.get(messagesKey)).toBeDefined();
    failCleanup = false;
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    expect(storage.get(messagesKey)).toBeUndefined();
    expect(storage.get(pendingDeletionsKey)).toBeUndefined();
  });

  it("retries failed deletion cleanup on the next list after storage recovers", async () => {
    const messagesKey = "@assistant-ui:messages:thread-1";
    const formattedKey =
      '@assistant-ui:formatted-messages:["thread-1","test/v1"]';
    const pendingDeletionsKey = "@assistant-ui:pending-thread-deletions";
    const baseStorage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular", formats: ["test/v1"] },
      ]),
      [messagesKey]: JSON.stringify({ messages: [] }),
      [formattedKey]: JSON.stringify({ messages: [] }),
    });
    let failCleanup = true;
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (failCleanup && (key === messagesKey || key === formattedKey)) {
          throw new Error("Storage unavailable");
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    expect(storage.get(messagesKey)).toBeDefined();
    expect(storage.get(formattedKey)).toBeDefined();
    expect(storage.get(pendingDeletionsKey)).toBeDefined();

    failCleanup = false;
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    expect(storage.get(messagesKey)).toBeUndefined();
    expect(storage.get(formattedKey)).toBeUndefined();
    expect(storage.get(pendingDeletionsKey)).toBeUndefined();
  });

  it("lists unrelated threads while pending cleanup keeps failing", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:thread-1";
    const baseStorage = createStorage({
      [threadsKey]: JSON.stringify([
        { remoteId: "thread-1", status: "regular" },
        { remoteId: "thread-2", status: "regular" },
      ]),
      [messagesKey]: JSON.stringify({ messages: [] }),
    });
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (key === messagesKey) throw new Error("Storage unavailable");
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    const reloadedAdapter = createLocalStorageAdapter({
      storage: { ...storage },
    });
    await expect(reloadedAdapter.list()).resolves.toEqual({
      threads: [
        {
          remoteId: "thread-2",
          externalId: undefined,
          status: "regular",
          title: undefined,
          custom: undefined,
        },
      ],
    });
    expect(storage.get(messagesKey)).toBeDefined();
  });

  it("keeps thread metadata when a deletion tombstone cannot be written", async () => {
    const threadsKey = "@assistant-ui:threads";
    const pendingDeletionsKey = "@assistant-ui:pending-thread-deletions";
    const originalThreads = [{ remoteId: "thread-1", status: "regular" }];
    const baseStorage = createStorage({
      [threadsKey]: JSON.stringify(originalThreads),
      "@assistant-ui:messages:thread-1": JSON.stringify({ messages: [] }),
    });
    const storage: AsyncStorageLike & {
      get(key: string): string | undefined;
    } = {
      ...baseStorage,
      setItem: async (key, value) => {
        if (key === pendingDeletionsKey) {
          throw new Error("Storage unavailable");
        }
        await baseStorage.setItem(key, value);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).rejects.toThrow(
      "Storage unavailable",
    );

    expect(JSON.parse(storage.get(threadsKey) ?? "null")).toEqual(
      originalThreads,
    );
  });

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

type TestMessage = { id: string; text: string };

const testFormat: MessageFormatAdapter<TestMessage, { text: string }> = {
  format: "test/v1",
  encode: ({ message }) => ({ text: message.text }),
  decode: (stored) => ({
    parentId: stored.parent_id,
    message: { id: stored.id, text: stored.content.text },
  }),
  getId: (message) => message.id,
};

const withTestFormat = (history: ThreadHistoryAdapter) => {
  if (!history.withFormat) throw new Error("withFormat is missing");
  return history.withFormat(testFormat);
};

const createThreadClient = (
  adapter: ReturnType<typeof createLocalStorageAdapter>,
  threadIds: string[],
) => {
  let currentId = threadIds[0]!;
  const item = (id: string) => ({
    getState: () => ({ id, remoteId: id }),
    initialize: () => adapter.initialize(id),
  });
  return {
    switchTo: (id: string) => {
      currentId = id;
    },
    getAui: () =>
      ({
        threadListItem: { source: "threads", ...item(currentId) },
        threads: {
          getState: () => ({
            threadItems: threadIds.map((id) => ({ id, remoteId: id })),
          }),
          item: ({ id }: { id: string }) => item(id),
        },
      }) as never,
  };
};

describe("createLocalStorageHistoryAdapter withFormat", () => {
  const formattedKey =
    '@assistant-ui:formatted-messages:["thread-1","test/v1"]';

  it("keeps formatted history separate from a legacy thread with the colliding id", async () => {
    const legacyKey = "@assistant-ui:messages:a:ai-sdk/v6";
    const storage = createStorage({
      [legacyKey]: JSON.stringify({
        messages: [{ message: storedMessage("legacy"), parentId: null }],
      }),
    });
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["a", "a:ai-sdk/v6"]);
    const history = createHistory(storage, client.getAui as () => never);
    const formatted = history.withFormat?.({
      ...testFormat,
      format: "ai-sdk/v6",
    });
    if (!formatted) throw new Error("withFormat is missing");

    await formatted.append({
      parentId: null,
      message: { id: "formatted", text: "hello" },
    });
    expect(storage.get(legacyKey)).toBeDefined();
    expect(
      JSON.parse(storage.get(legacyKey) ?? "").messages[0].message.id,
    ).toBe("legacy");
    await expect(formatted.load()).resolves.toEqual({
      messages: [
        { parentId: null, message: { id: "formatted", text: "hello" } },
      ],
    });

    await adapter.delete("a");
    client.switchTo("a:ai-sdk/v6");
    await expect(
      createHistory(storage, client.getAui as () => never).load(),
    ).resolves.toMatchObject({
      messages: [{ message: { id: "legacy" }, parentId: null }],
    });
  });

  it("encodes thread ids and formats without collisions", async () => {
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["a:b", "a"]);
    const first = createHistory(
      storage,
      client.getAui as () => never,
    ).withFormat?.({
      ...testFormat,
      format: "c",
    });
    if (!first) throw new Error("withFormat is missing");
    await first.append({ parentId: null, message: { id: "first", text: "1" } });
    client.switchTo("a");
    const second = createHistory(
      storage,
      client.getAui as () => never,
    ).withFormat?.({
      ...testFormat,
      format: "b:c",
    });
    if (!second) throw new Error("withFormat is missing");
    await second.append({
      parentId: null,
      message: { id: "second", text: "2" },
    });

    client.switchTo("a:b");
    await expect(first.load()).resolves.toEqual({
      messages: [{ parentId: null, message: { id: "first", text: "1" } }],
    });
    client.switchTo("a");
    await expect(second.load()).resolves.toEqual({
      messages: [{ parentId: null, message: { id: "second", text: "2" } }],
    });
  });

  it("reads existing unformatted history", async () => {
    const storage = createStorage({
      "@assistant-ui:messages:thread-1": JSON.stringify({
        messages: [{ message: storedMessage("legacy"), parentId: null }],
      }),
    });
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1"]);

    await expect(
      createHistory(storage, client.getAui as () => never).load(),
    ).resolves.toMatchObject({
      messages: [{ message: { id: "legacy" }, parentId: null }],
    });
  });

  it("preserves later turns after deleting a middle turn and reloading", async () => {
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1"]);
    const formatted = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );
    const turns = [
      { parentId: null, message: { id: "user-1", text: "one" } },
      { parentId: "user-1", message: { id: "assistant-1", text: "two" } },
      { parentId: "assistant-1", message: { id: "user-2", text: "three" } },
      { parentId: "user-2", message: { id: "assistant-2", text: "four" } },
    ];
    for (const turn of turns) await formatted.append(turn);
    await formatted.delete?.([turns[1]!]);

    const reloaded = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );
    await expect(reloaded.load()).resolves.toEqual({
      messages: [turns[0], { ...turns[2], parentId: "user-1" }, turns[3]],
    });
  });

  it("appends, updates, deletes, and reloads formatted messages", async () => {
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1"]);
    const formatted = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );

    await formatted.append({
      parentId: null,
      message: { id: "user-1", text: "hello" },
    });
    await formatted.append({
      parentId: "user-1",
      message: { id: "assistant-1", text: "draft" },
    });
    await formatted.update?.(
      { parentId: "user-1", message: { id: "assistant-1", text: "final" } },
      "assistant-1",
    );
    await formatted.update?.(
      { parentId: "assistant-1", message: { id: "user-2", text: "again" } },
      "user-2",
    );
    await formatted.append({
      parentId: "user-2",
      message: { id: "assistant-2", text: "removed" },
    });
    await formatted.delete?.([
      {
        parentId: "user-2",
        message: { id: "assistant-2", text: "removed" },
      },
    ]);

    expect(JSON.parse(storage.get(formattedKey) ?? "")).toEqual({
      messages: [
        {
          id: "user-1",
          parent_id: null,
          format: "test/v1",
          content: { text: "hello" },
        },
        {
          id: "assistant-1",
          parent_id: "user-1",
          format: "test/v1",
          content: { text: "final" },
        },
        {
          id: "user-2",
          parent_id: "assistant-1",
          format: "test/v1",
          content: { text: "again" },
        },
      ],
    });

    const reloaded = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );
    await expect(reloaded.load()).resolves.toEqual({
      messages: [
        { parentId: null, message: { id: "user-1", text: "hello" } },
        { parentId: "user-1", message: { id: "assistant-1", text: "final" } },
        { parentId: "assistant-1", message: { id: "user-2", text: "again" } },
      ],
    });
    await expect(adapter.list()).resolves.toEqual({
      threads: [
        {
          remoteId: "thread-1",
          externalId: undefined,
          status: "regular",
          title: undefined,
          custom: undefined,
        },
      ],
    });
  });

  it("writes to the pinned thread after a switch", async () => {
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1", "thread-2"]);
    const formatted = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );

    formatted.pin?.();
    client.switchTo("thread-2");
    await formatted.append({
      parentId: null,
      message: { id: "user-1", text: "hello" },
    });
    await formatted.update?.(
      { parentId: null, message: { id: "user-1", text: "edited" } },
      "user-1",
    );

    expect(
      JSON.parse(storage.get(formattedKey) ?? "").messages.map(
        (entry: { content: { text: string } }) => entry.content.text,
      ),
    ).toEqual(["edited"]);
    expect(
      storage.get('@assistant-ui:formatted-messages:["thread-2","test/v1"]'),
    ).toBeUndefined();
  });

  it("keeps thread message history and formatted history apart", async () => {
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1"]);
    const history = createHistory(storage, client.getAui as () => never);
    const formatted = withTestFormat(history);

    await history.append({
      message: {
        ...storedMessage("thread-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);
    await formatted.append({
      parentId: null,
      message: { id: "formatted-message", text: "hello" },
    });
    await history.update?.({
      message: {
        ...storedMessage("thread-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);

    const repo = await history.load();
    expect(repo.messages.map(({ message }) => message.id)).toEqual([
      "thread-message",
    ]);
    expect(repo.headId).toBe("thread-message");
    await expect(formatted.load()).resolves.toEqual({
      messages: [
        {
          parentId: null,
          message: { id: "formatted-message", text: "hello" },
        },
      ],
    });
  });

  it("removes formatted history when its thread is deleted", async () => {
    const storage = createStorage();
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1"]);
    const history = createHistory(storage, client.getAui as () => never);
    const formatted = withTestFormat(history);

    await history.append({
      message: {
        ...storedMessage("thread-message"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      parentId: null,
    } as never);
    await formatted.append({
      parentId: null,
      message: { id: "formatted-message", text: "hello" },
    });
    expect(storage.get(formattedKey)).toBeDefined();

    await adapter.delete("thread-1");

    expect(storage.get(formattedKey)).toBeUndefined();
    expect(storage.get("@assistant-ui:messages:thread-1")).toBeUndefined();
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
  });

  it("clears stale formatted history before reading a reused thread id", async () => {
    const baseStorage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular", formats: ["test/v1"] },
      ]),
      [formattedKey]: JSON.stringify({
        messages: [
          {
            id: "old-message",
            parent_id: null,
            format: "test/v1",
            content: { text: "old" },
          },
        ],
      }),
    });
    let failCleanup = true;
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (key === formattedKey && failCleanup) {
          failCleanup = false;
          throw new Error("Storage unavailable");
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    await adapter.initialize("thread-1");
    const client = createThreadClient(adapter, ["thread-1"]);
    const formatted = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );

    await expect(formatted.load()).resolves.toEqual({ messages: [] });
    expect(storage.get(formattedKey)).toBeUndefined();
  });

  it("retries formatted history cleanup after a committed delete", async () => {
    const baseStorage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular", formats: ["test/v1"] },
      ]),
      [formattedKey]: JSON.stringify({ messages: [] }),
    });
    let failCleanup = true;
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (key === formattedKey && failCleanup) {
          throw new Error("Storage unavailable");
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    expect(storage.get(formattedKey)).toBeDefined();

    failCleanup = false;
    await createLocalStorageAdapter({ storage }).delete("thread-1");

    expect(storage.get(formattedKey)).toBeUndefined();
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
  });

  it("waits for sibling removals before reusing a deleted thread", async () => {
    const baseStorage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular", formats: ["test/v1"] },
      ]),
      [formattedKey]: JSON.stringify({ messages: [] }),
    });
    let failMessagesCleanup = true;
    let holdFormattedCleanup = true;
    let signalCleanupStarted!: () => void;
    const cleanupStarted = new Promise<void>((resolve) => {
      signalCleanupStarted = resolve;
    });
    let releaseCleanup!: () => void;
    const cleanupHeld = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (key === "@assistant-ui:messages:thread-1" && failMessagesCleanup) {
          failMessagesCleanup = false;
          throw new Error("Storage unavailable");
        }
        if (key === formattedKey && holdFormattedCleanup) {
          holdFormattedCleanup = false;
          signalCleanupStarted();
          await cleanupHeld;
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });
    const client = createThreadClient(adapter, ["thread-1"]);
    const formatted = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );

    const deletion = adapter.delete("thread-1");
    await cleanupStarted;
    const write = adapter.initialize("thread-1").then(() =>
      formatted.append({
        parentId: null,
        message: { id: "new-message", text: "fresh" },
      }),
    );
    try {
      await Promise.race([
        write,
        new Promise<void>((resolve) => setTimeout(resolve, 0)),
      ]);
    } finally {
      releaseCleanup();
    }

    await expect(deletion).resolves.toBeUndefined();
    await write;
    await expect(formatted.load()).resolves.toEqual({
      messages: [
        { parentId: null, message: { id: "new-message", text: "fresh" } },
      ],
    });
  });

  it("preserves a concurrent formatted write during stale history cleanup", async () => {
    const baseStorage = createStorage({
      "@assistant-ui:threads": JSON.stringify([
        { remoteId: "thread-1", status: "regular", formats: ["test/v1"] },
      ]),
      [formattedKey]: JSON.stringify({ messages: [] }),
    });
    let removalAttempts = 0;
    let signalCleanupStarted!: () => void;
    const cleanupStarted = new Promise<void>((resolve) => {
      signalCleanupStarted = resolve;
    });
    let releaseCleanup!: () => void;
    const cleanupHeld = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const storage = {
      ...baseStorage,
      removeItem: async (key: string) => {
        if (key === formattedKey) {
          removalAttempts++;
          if (removalAttempts === 1) throw new Error("Storage unavailable");
          if (removalAttempts === 2) {
            signalCleanupStarted();
            await cleanupHeld;
          }
        }
        await baseStorage.removeItem(key);
      },
    };
    const adapter = createLocalStorageAdapter({ storage });

    await expect(adapter.delete("thread-1")).resolves.toBeUndefined();
    const listing = adapter.list();
    await cleanupStarted;
    const initialization = adapter.initialize("thread-1");
    const client = createThreadClient(adapter, ["thread-1"]);
    const formatted = withTestFormat(
      createHistory(storage, client.getAui as () => never),
    );

    const write = formatted.append({
      parentId: null,
      message: { id: "new-message", text: "fresh" },
    });
    try {
      await Promise.race([
        write,
        new Promise<void>((resolve) => setTimeout(resolve, 0)),
      ]);
    } finally {
      releaseCleanup();
    }

    await expect(listing).resolves.toEqual({ threads: [] });
    await initialization;
    await write;
    expect(storage.get(formattedKey)).toBeDefined();
    expect(JSON.parse(storage.get(formattedKey) ?? "")).toEqual({
      messages: [
        {
          id: "new-message",
          parent_id: null,
          format: "test/v1",
          content: { text: "fresh" },
        },
      ],
    });
    await expect(formatted.load()).resolves.toEqual({
      messages: [
        { parentId: null, message: { id: "new-message", text: "fresh" } },
      ],
    });
  });
});
