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

  it("drops a null attachment and null attachment parts without rejecting the load", () => {
    const item = auiV0DecodeSafely(
      row(
        "u",
        userPayload([{ type: "text", text: "see attachment" }], {
          attachments: [
            null,
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
});
