import { describe, it, expect } from "vitest";
import { serializeMessages, deserializeMessages } from "../share/serialization";
import type { ThreadMessage } from "../types/message";

const makeUserMessage = (overrides?: Partial<ThreadMessage>): ThreadMessage =>
  ({
    id: "msg-1",
    role: "user" as const,
    createdAt: new Date("2026-03-25T10:00:00Z"),
    content: [{ type: "text" as const, text: "Hello" }],
    attachments: [],
    metadata: { custom: {} },
    ...overrides,
  }) as ThreadMessage;

const makeAssistantMessage = (
  overrides?: Partial<ThreadMessage>,
): ThreadMessage =>
  ({
    id: "msg-2",
    role: "assistant" as const,
    createdAt: new Date("2026-03-25T10:00:01Z"),
    content: [{ type: "text" as const, text: "Hi there" }],
    status: { type: "complete" as const, reason: "stop" as const },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
    ...overrides,
  }) as ThreadMessage;

describe("serializeMessages", () => {
  it("converts Date to ISO string", () => {
    const messages = [makeUserMessage()];
    const result = serializeMessages(messages);
    expect(result[0]!.createdAt).toBe("2026-03-25T10:00:00.000Z");
  });

  it("strips attachment file and status", () => {
    const messages = [
      makeUserMessage({
        attachments: [
          {
            id: "att-1",
            type: "document",
            name: "test.pdf",
            contentType: "application/pdf",
            status: { type: "complete" as const },
            content: [{ type: "text" as const, text: "pdf content" }],
            file: new File([""], "test.pdf"),
          },
        ],
      }),
    ];
    const result = serializeMessages(messages);
    const att = (result[0] as any).attachments[0];
    expect(att.file).toBeUndefined();
    expect(att.status).toBeUndefined();
    expect(att.id).toBe("att-1");
    expect(att.content).toEqual([{ type: "text", text: "pdf content" }]);
  });

  it("preserves message content and metadata", () => {
    const messages = [makeAssistantMessage()];
    const result = serializeMessages(messages);
    expect(result[0]!.content).toEqual([{ type: "text", text: "Hi there" }]);
    expect(result[0]!.id).toBe("msg-2");
  });

  it("produces valid JSON", () => {
    const messages = [makeUserMessage(), makeAssistantMessage()];
    const result = serializeMessages(messages);
    const json = JSON.stringify(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("deserializeMessages", () => {
  it("converts ISO string back to Date", () => {
    const serialized = serializeMessages([makeUserMessage()]);
    const result = deserializeMessages(serialized);
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[0]!.createdAt.toISOString()).toBe("2026-03-25T10:00:00.000Z");
  });

  it("re-adds attachment status", () => {
    const messages = [
      makeUserMessage({
        attachments: [
          {
            id: "att-1",
            type: "document",
            name: "test.pdf",
            status: { type: "complete" as const },
            content: [{ type: "text" as const, text: "content" }],
          },
        ],
      }),
    ];
    const serialized = serializeMessages(messages);
    const result = deserializeMessages(serialized);
    expect((result[0] as any).attachments[0].status).toEqual({
      type: "complete",
    });
  });

  it("roundtrips messages without loss", () => {
    const messages = [makeUserMessage(), makeAssistantMessage()];
    const serialized = serializeMessages(messages);
    const deserialized = deserializeMessages(serialized);
    expect(deserialized[0]!.id).toBe("msg-1");
    expect(deserialized[0]!.role).toBe("user");
    expect(deserialized[1]!.id).toBe("msg-2");
    expect(deserialized[1]!.role).toBe("assistant");
  });

  it("throws on missing required fields", () => {
    expect(() => deserializeMessages([{} as any])).toThrow();
  });

  it("throws on invalid createdAt", () => {
    expect(() =>
      deserializeMessages([{ ...makeUserMessage(), createdAt: 123 } as any]),
    ).toThrow();
  });
});
