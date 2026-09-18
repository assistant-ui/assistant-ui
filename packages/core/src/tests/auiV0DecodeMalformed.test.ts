import { describe, expect, it } from "vitest";
import { auiV0DecodeSafely } from "../react/runtimes/cloud/auiV0";

const row = (id: string, content: unknown) =>
  ({
    id,
    parent_id: null,
    format: "aui/v0",
    created_at: new Date(0),
    content,
  }) as unknown as Parameters<typeof auiV0DecodeSafely>[0];

const assistantPayload = (content: unknown[]) => ({
  role: "assistant",
  status: { type: "complete", reason: "stop" },
  content,
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const userPayload = (
  content: unknown[],
  extra: Record<string, unknown> = {},
) => ({
  role: "user",
  content,
  ...extra,
});

describe("auiV0DecodeSafely with malformed stored rows", () => {
  it("drops a null part and keeps the rest of an assistant row", () => {
    const item = auiV0DecodeSafely(
      row("a", assistantPayload([null, { type: "text", text: "hi" }])),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("drops malformed known part variants and keeps readable ones", () => {
    const item = auiV0DecodeSafely(
      row(
        "a",
        assistantPayload([
          { type: "text" },
          { type: "tool-call", toolCallId: "call-1", toolName: "noop" },
          { type: "image", image: 42 },
          { type: "text", text: "kept" },
        ]),
      ),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "kept" }]);
  });

  it("keeps unknown and data-prefixed part types for forward compatibility", () => {
    const item = auiV0DecodeSafely(
      row(
        "a",
        assistantPayload([
          { type: "future-part", foo: "bar" },
          { type: "data-chart", data: { points: [1, 2] } },
        ]),
      ),
    );

    expect(item?.message.content).toEqual([
      { type: "data", name: "chart", data: { points: [1, 2] } },
    ]);
  });

  it("keeps an assistant error row that has no readable parts yet", () => {
    const item = auiV0DecodeSafely(
      row("a", {
        role: "assistant",
        status: { type: "incomplete", reason: "error" },
        content: [],
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      }),
    );

    expect(item?.message.role).toBe("assistant");
    expect(item?.message.status).toEqual({
      type: "incomplete",
      reason: "error",
    });
  });

  it("keeps a user row alive when a valid attachment exists alongside malformed parts", () => {
    const item = auiV0DecodeSafely(
      row(
        "u",
        userPayload([{ type: "text" }], {
          attachments: [
            {
              id: "attachment-1",
              type: "document",
              name: "notes.txt",
              status: { type: "complete" },
              content: [{ type: "text", text: "notes" }],
            },
          ],
        }),
      ),
    );

    const message = item?.message;
    if (message?.role !== "user") throw new Error("expected a user message");
    expect(message.attachments).toHaveLength(1);
    expect(item?.message.content).toEqual([]);
  });

  it("drops a null attachment, malformed attachments, and null attachment parts", () => {
    const item = auiV0DecodeSafely(
      row(
        "u",
        userPayload([{ type: "text", text: "see attachment" }], {
          attachments: [
            null,
            { id: "broken", content: [{ type: "text", text: "x" }] },
            {
              id: "attachment-1",
              type: "document",
              name: "notes.txt",
              status: { type: "complete" },
              content: [null, { type: "text", text: "notes" }],
            },
          ],
        }),
      ),
    );

    const message = item?.message;
    if (message?.role !== "user") throw new Error("expected a user message");
    expect(message.attachments).toEqual([
      {
        id: "attachment-1",
        type: "document",
        name: "notes.txt",
        status: { type: "complete" },
        content: [{ type: "text", text: "notes" }],
      },
    ]);
  });

  it("returns null for a row whose content is not a message payload", () => {
    expect(auiV0DecodeSafely(row("dead", null))).toBeNull();
    expect(auiV0DecodeSafely(row("dead", { role: "assistant" }))).toBeNull();
    expect(
      auiV0DecodeSafely(row("dead", { role: "robot", content: [] })),
    ).toBeNull();
  });

  it("returns null when every part of the payload is unreadable", () => {
    expect(
      auiV0DecodeSafely(
        row("dead", assistantPayload([{ type: "text" }, { type: "image" }])),
      ),
    ).toBeNull();
  });

  it("sanitizes nested tool-call messages the same way", () => {
    const item = auiV0DecodeSafely(
      row(
        "a",
        assistantPayload([
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "delegate",
            args: {},
            argsText: "{}",
            messages: [
              null,
              {
                role: "assistant",
                content: [null, { type: "text", text: "nested" }],
              },
            ],
          },
        ]),
      ),
    );

    const part = item?.message.content[0];
    expect(part?.type).toBe("tool-call");
    expect(
      part?.type === "tool-call" ? part.messages?.[0]?.content : undefined,
    ).toEqual([{ type: "text", text: "nested" }]);
    expect(part?.type === "tool-call" ? part.messages?.length : undefined).toBe(
      1,
    );
  });

  it("keeps a user row that carries misplaced status or metadata.steps", () => {
    const item = auiV0DecodeSafely(
      row(
        "u",
        userPayload([{ type: "text", text: "hi" }], {
          status: { type: "complete", reason: "stop" },
          metadata: {
            custom: {},
            steps: [{ usage: { inputTokens: 1, outputTokens: 1 } }],
          },
        }),
      ),
    );

    expect(item?.message.content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("keeps a user row with malformed attachments-only payload when a valid attachment exists", () => {
    const item = auiV0DecodeSafely(
      row(
        "u",
        userPayload([{ type: "text" }], {
          attachments: [
            {
              id: "attachment-1",
              type: "document",
              name: "notes.txt",
              status: { type: "complete" },
              content: [{ type: "text", text: "notes" }],
            },
          ],
        }),
      ),
    );

    const message = item?.message;
    if (message?.role !== "user") throw new Error("expected a user message");
    expect(message.attachments).toHaveLength(1);
  });

  it("drops a row whose nested tool-call messages exceed the depth limit instead of overflowing", () => {
    let payload: Record<string, unknown> = {
      role: "assistant",
      content: [{ type: "text", text: "bottom" }],
    };
    for (let i = 0; i < 150; i++) {
      payload = {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: `call-${i}`,
            toolName: "delegate",
            args: {},
            argsText: "{}",
            messages: [payload],
          },
        ],
      };
    }

    expect(() => auiV0DecodeSafely(row("deep", payload))).not.toThrow();
    const item = auiV0DecodeSafely(row("deep", payload));
    expect(item).not.toBeNull();
    // Walk down the surviving tool-call chain: it must terminate (truncated
    // by the depth limit) well before the stored 150 levels.
    let current = item?.message;
    let depth = 0;
    for (;;) {
      const part = current?.content[0];
      if (part?.type !== "tool-call") break;
      const nested = part.messages ?? [];
      if (nested.length === 0) break;
      current = nested[0];
      depth++;
    }
    expect(depth).toBeLessThan(150);
    expect(depth).toBeGreaterThan(0);
  });
});
