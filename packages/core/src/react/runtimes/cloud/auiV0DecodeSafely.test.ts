import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudMessage } from "assistant-cloud";
import type {
  MessageStatus,
  ThreadAssistantMessage,
  ThreadUserMessage,
} from "../../../types";
import { auiV0DecodeSafely, auiV0Encode } from "./auiV0";

const storedRow = (content: unknown) =>
  ({
    id: "message-1",
    parent_id: null,
    format: "aui/v0",
    created_at: new Date(0),
    content,
  }) as unknown as CloudMessage & { format: "aui/v0" };

const assistantRow = (content: unknown, rest: Record<string, unknown> = {}) =>
  storedRow({ role: "assistant", content, ...rest });

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auiV0DecodeSafely", () => {
  it("drops an unreadable part and keeps its readable siblings", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        { type: "text", text: "before" },
        null,
        { type: "text", text: 42 },
        { type: "text", text: "after" },
      ]),
    );

    expect(item?.message.content).toEqual([
      { type: "text", text: "before" },
      { type: "text", text: "after" },
    ]);
  });

  it("keeps a row whose every part was unreadable so its descendants survive", () => {
    const item = auiV0DecodeSafely(assistantRow([null]));

    expect(item?.message.content).toEqual([]);
  });

  it("preserves a requires-action status", () => {
    const item = auiV0DecodeSafely(
      assistantRow([{ type: "text", text: "approve?" }], {
        status: { type: "requires-action", reason: "tool-calls" },
      }),
    );

    expect(item?.message.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

  it("normalizes malformed assistant status and step metadata", () => {
    const item = auiV0DecodeSafely(
      assistantRow([{ type: "text", text: "answer" }], {
        status: { type: "unknown" },
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
      }),
    );

    expect(item?.message.status).toEqual({
      type: "complete",
      reason: "unknown",
    });
    expect(item?.message.metadata.steps).toEqual([
      {},
      { usage: { inputTokens: 7, outputTokens: 8 } },
      { usage: { inputTokens: 1, outputTokens: 2 } },
      { usage: { inputTokens: 1 } },
      { usage: { promptTokens: 3, completionTokens: 4 } },
      { usage: { inputTokenDetails: { cacheReadTokens: 5 } } },
      {},
    ]);
  });

  it("keeps both one-sided tool call encodings", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search",
          args: { query: "a" },
        },
        {
          type: "tool-call",
          toolCallId: "call-2",
          toolName: "search",
          argsText: '{"query":"b"}',
        },
      ]),
    );

    expect(item?.message.content).toMatchObject([
      { toolCallId: "call-1", args: { query: "a" } },
      { toolCallId: "call-2", args: { query: "b" } },
    ]);
  });

  it("drops malformed tool-call interactions without dropping the message", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search",
          args: {},
          unstable_interactions: {
            entries: [{ type: "unknown", occurredAt: 1, payload: null }],
          },
        },
        { type: "text", text: "kept" },
      ]),
    );

    expect(item?.message.content).toHaveLength(2);
    expect(item?.message.content[0]).not.toHaveProperty(
      "unstable_interactions",
    );
    expect(item?.message.content[1]).toEqual({ type: "text", text: "kept" });
  });

  it("keeps a data prefixed part the decoder can still convert", () => {
    const item = auiV0DecodeSafely(
      assistantRow([{ type: "data-weather", data: { city: "Berlin" } }]),
    );

    expect(item?.message.content).toHaveLength(1);
  });

  it("drops an unknown part type the decoder would throw on", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        { type: "widget", spec: {} },
        { type: "text", text: "kept" },
      ]),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("drops a tool call whose stored args are not an object", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search",
          args: "bad",
          argsText: "{}",
        },
        { type: "text", text: "kept" },
      ]),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("drops an unreadable attachment and keeps the message", () => {
    const item = auiV0DecodeSafely(
      storedRow({
        role: "user",
        content: [{ type: "text", text: "look" }],
        attachments: [
          null,
          {
            id: "attachment-1",
            type: "document",
            name: "notes.txt",
            status: { type: "complete" },
            content: [{ type: "text", text: "notes" }],
          },
        ],
      }),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "look" }]);
    expect(item?.message).toMatchObject({
      attachments: [{ id: "attachment-1" }],
    });
  });

  it("drops an unreadable nested message and keeps the tool call", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "delegate",
          args: {},
          messages: [
            null,
            {
              id: "nested-1",
              role: "assistant",
              content: [{ type: "text", text: "nested" }],
            },
          ],
        },
      ]),
    );

    expect(item?.message.content[0]).toMatchObject({
      type: "tool-call",
      messages: [{ id: "nested-1" }],
    });
  });

  it("drops a part the row's role cannot carry and keeps its siblings", () => {
    const item = auiV0DecodeSafely(
      storedRow({
        role: "user",
        content: [
          { type: "reasoning", text: "assistant only" },
          { type: "text", text: "kept" },
        ],
        metadata: { custom: {} },
      }),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("drops an audio part from an assistant row", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        { type: "audio", audio: { data: "abc", format: "mp3" } },
        { type: "text", text: "kept" },
      ]),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("drops attachments stored on a row that cannot carry them", () => {
    const item = auiV0DecodeSafely(
      assistantRow([{ type: "text", text: "kept" }], {
        attachments: [
          {
            id: "attachment-1",
            type: "document",
            name: "notes.txt",
            status: { type: "complete" },
            content: [],
          },
        ],
      }),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("drops a tool call whose stored argsText is not a string", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search",
          args: { query: "a" },
          argsText: 42,
        },
        { type: "text", text: "kept" },
      ]),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("keeps a data prefixed attachment part", () => {
    const item = auiV0DecodeSafely(
      storedRow({
        role: "user",
        content: [{ type: "text", text: "look" }],
        metadata: { custom: {} },
        attachments: [
          {
            id: "attachment-1",
            type: "document",
            name: "notes.txt",
            status: { type: "complete" },
            content: [{ type: "data-weather", data: { city: "Berlin" } }],
          },
        ],
      }),
    );

    expect(item?.message).toMatchObject({
      attachments: [{ id: "attachment-1", content: [{ type: "data" }] }],
    });
  });

  it("drops a nested message whose role is unreadable", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "delegate",
          args: {},
          messages: [
            { id: "nested-1", role: "moderator", content: [] },
            {
              id: "nested-2",
              role: "assistant",
              content: [{ type: "text", text: "nested" }],
            },
          ],
        },
      ]),
    );

    expect(item?.message.content[0]).toMatchObject({
      type: "tool-call",
      messages: [{ id: "nested-2" }],
    });
  });

  it("drops a reasoning part whose other field is not a string", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        { type: "reasoning", text: 42, unstable_summary: "valid" },
        { type: "text", text: "kept" },
      ]),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("keeps only the text part of a system row", () => {
    const item = auiV0DecodeSafely(
      storedRow({
        role: "system",
        content: [
          { type: "data-weather", data: { city: "Berlin" } },
          { type: "text", text: "be brief" },
        ],
        metadata: { custom: {} },
      }),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "be brief" }]);
  });

  it("drops a nested system message the decoder would reject", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "delegate",
          args: {},
          messages: [
            {
              id: "nested-1",
              role: "system",
              content: [{ type: "reasoning", text: "not a system part" }],
            },
            {
              id: "nested-2",
              role: "assistant",
              content: [{ type: "text", text: "nested" }],
            },
          ],
        },
      ]),
    );

    expect(item?.message.content[0]).toMatchObject({
      type: "tool-call",
      messages: [{ id: "nested-2" }],
    });
  });

  it("keeps a nested message with an unreadable createdAt re-encodable", () => {
    const item = auiV0DecodeSafely(
      assistantRow([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "delegate",
          args: {},
          messages: [
            {
              id: "nested-1",
              role: "assistant",
              createdAt: "nonsense",
              content: [{ type: "text", text: "nested" }],
            },
          ],
        },
      ]),
    );

    expect(item?.message.content[0]).toMatchObject({
      messages: [{ id: "nested-1" }],
    });
    expect(() => auiV0Encode(item!.message)).not.toThrow();
  });

  it("drops a status and metadata steps a non-assistant row cannot carry", () => {
    const item = auiV0DecodeSafely(
      storedRow({
        role: "user",
        content: [{ type: "text", text: "kept" }],
        status: { type: "complete", reason: "stop" },
        metadata: { custom: {}, steps: [{ usage: {} }] },
      }),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
    expect(item?.message).not.toHaveProperty("status");
  });

  it("returns null for a row that does not hold a message", () => {
    expect(auiV0DecodeSafely(storedRow(null))).toBeNull();
    expect(auiV0DecodeSafely(storedRow({ role: "assistant" }))).toBeNull();
  });

  it("returns null for a row the decoder cannot read back", () => {
    expect(
      auiV0DecodeSafely(storedRow({ role: "moderator", content: [] })),
    ).toBeNull();
  });

  it("bounds nesting so a deeply nested row cannot overflow the stack", () => {
    let content: unknown = [{ type: "text", text: "bottom" }];
    for (let i = 0; i < 5000; i++) {
      content = [
        {
          type: "tool-call",
          toolCallId: `call-${i}`,
          toolName: "delegate",
          args: {},
          messages: [{ id: `nested-${i}`, role: "assistant", content }],
        },
      ];
    }

    const item = auiV0DecodeSafely(assistantRow(content));

    expect(item?.message.content[0]).toMatchObject({ type: "tool-call" });
  });
});

describe("auiV0DecodeSafely against encoder output", () => {
  const encodedRow = (message: ThreadAssistantMessage | ThreadUserMessage) =>
    ({
      id: message.id,
      parent_id: null,
      format: "aui/v0",
      created_at: message.createdAt,
      content: auiV0Encode(message),
    }) as unknown as CloudMessage & { format: "aui/v0" };

  it("keeps every assistant status the encoder writes", () => {
    const statuses: MessageStatus[] = [
      { type: "running" },
      { type: "requires-action", reason: "tool-calls" },
      { type: "requires-action", reason: "interrupt" },
      { type: "complete", reason: "stop" },
      { type: "complete", reason: "unknown" },
      { type: "incomplete", reason: "cancelled" },
      { type: "incomplete", reason: "tool-calls" },
      { type: "incomplete", reason: "length" },
      { type: "incomplete", reason: "content-filter" },
      { type: "incomplete", reason: "other" },
      { type: "incomplete", reason: "error", error: { message: "failed" } },
      { type: "incomplete", reason: "max_tokens" } as unknown as MessageStatus,
    ];

    for (const status of statuses) {
      const message: ThreadAssistantMessage = {
        id: `assistant-${status.type}`,
        role: "assistant",
        status,
        createdAt: new Date(0),
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [
            { messageId: "step-1", usage: { inputTokens: 1, outputTokens: 2 } },
          ],
          custom: {},
        },
        content: [{ type: "text", text: "answer" }],
      };

      const item = auiV0DecodeSafely(encodedRow(message));
      const expectedStatus =
        status.type === "running"
          ? { type: "incomplete", reason: "cancelled" }
          : status;

      expect(item?.message.status).toEqual(expectedStatus);
      expect(item?.message.metadata.steps).toEqual(message.metadata.steps);
    }
  });

  it("keeps provider usage shapes the encoder writes", () => {
    const providerSteps = [
      { usage: { promptTokens: 3, completionTokens: 4 } },
      { usage: { inputTokens: 0, cachedInputTokens: 5 } },
      { usage: { inputTokenDetails: { cacheReadTokens: 5 } } },
    ];
    const message = {
      id: "assistant-provider-usage",
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      createdAt: new Date(0),
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: providerSteps,
        custom: {},
      },
      content: [{ type: "text", text: "answer" }],
    } as unknown as ThreadAssistantMessage;

    const item = auiV0DecodeSafely(encodedRow(message));

    expect(item?.message.metadata.steps).toEqual(providerSteps);
  });

  it("keeps every assistant part the encoder writes", () => {
    const message: ThreadAssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      createdAt: new Date(0),
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        { type: "text", text: "answer" },
        { type: "reasoning", text: "thinking" },
        {
          type: "source",
          sourceType: "url",
          id: "src-1",
          url: "https://x.dev",
        },
        { type: "image", image: "https://x.dev/a.png" },
        { type: "file", data: "abc", mimeType: "text/plain" },
        { type: "data", name: "weather", data: { city: "Berlin" } },
        { type: "generative-ui", spec: { root: "a" } },
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search",
          args: { query: "a" },
          argsText: '{"query":"a"}',
        },
        {
          type: "tool-call",
          toolCallId: "call-2",
          toolName: "search",
          args: { query: "b" },
          argsText: '{"query":"b"',
          messages: [
            {
              id: "nested-1",
              role: "assistant",
              status: { type: "complete", reason: "stop" },
              createdAt: new Date(0),
              content: [{ type: "text", text: "nested" }],
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
      ],
    };

    const item = auiV0DecodeSafely(encodedRow(message));

    expect(item?.message.content.map((part) => part.type)).toEqual(
      message.content.map((part) => part.type),
    );
    // encodeNestedMessage writes an id and an ISO createdAt that no flat
    // fixture carries, so the nested guard stack is only pinned here.
    expect(item?.message.content.at(-1)).toMatchObject({
      messages: [{ id: "nested-1", content: [{ type: "text" }] }],
    });
  });

  it("keeps every user attachment part the encoder writes", () => {
    const message: ThreadUserMessage = {
      id: "user-1",
      role: "user",
      createdAt: new Date(0),
      metadata: { custom: {} },
      content: [{ type: "text", text: "look" }],
      attachments: [
        {
          id: "attachment-1",
          type: "document",
          name: "notes.txt",
          status: { type: "complete" },
          content: [
            { type: "text", text: "notes" },
            { type: "image", image: "https://x.dev/a.png" },
            { type: "file", data: "abc", mimeType: "text/plain" },
            { type: "data", name: "weather", data: { city: "Berlin" } },
            { type: "audio", audio: { data: "abc", format: "mp3" } },
          ],
        },
      ],
    };

    const item = auiV0DecodeSafely(encodedRow(message));

    expect(
      (item?.message as ThreadUserMessage).attachments[0]?.content.map(
        (part) => part.type,
      ),
    ).toEqual(message.attachments[0]?.content.map((part) => part.type));
  });

  it("keeps provider metadata on file parts and file attachments", () => {
    const providerMetadata = { openai: { fileId: "file-123" } };
    const assistant: ThreadAssistantMessage = {
      id: "assistant-file",
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      createdAt: new Date(0),
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
          type: "file",
          data: "file-123",
          mimeType: "application/pdf",
          sourceType: "id",
          providerMetadata,
        },
      ],
    };
    const user: ThreadUserMessage = {
      id: "user-file",
      role: "user",
      createdAt: new Date(0),
      metadata: { custom: {} },
      content: [],
      attachments: [
        {
          id: "attachment-1",
          type: "file",
          name: "report.pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "file-123",
              mimeType: "application/pdf",
              sourceType: "id",
              providerMetadata,
            },
          ],
        },
      ],
    };

    expect(
      auiV0DecodeSafely(encodedRow(assistant))?.message.content[0],
    ).toMatchObject({
      providerMetadata,
    });
    expect(auiV0DecodeSafely(encodedRow(user))?.message).toMatchObject({
      attachments: [{ content: [{ providerMetadata }] }],
    });
  });
});
