import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudMessage } from "assistant-cloud";
import { auiV0DecodeSafely } from "./auiV0";

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

  it("keeps a part type it does not know", () => {
    const item = auiV0DecodeSafely(
      assistantRow([{ type: "data-weather", data: { city: "Berlin" } }]),
    );

    expect(item?.message.content).toHaveLength(1);
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
