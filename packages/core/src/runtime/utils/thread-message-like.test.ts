import { describe, expect, it } from "vitest";
import { fromThreadMessageLike } from "./thread-message-like";

describe("fromThreadMessageLike", () => {
  it("preserves assistant run identity", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: "Hello",
        metadata: { runId: "run-1" },
      },
      "assistant-id",
      { type: "complete", reason: "stop" },
    );

    expect(message.metadata).toMatchObject({ runId: "run-1" });
  });

  it.each(["assistant", "user"] as const)(
    "drops non-string data-prefixed part ids on %s messages",
    (role) => {
      const invalidIds = [null, 42, true, {}, []];
      const message = fromThreadMessageLike(
        {
          role,
          content: invalidIds.map((id) => ({
            type: "data-workflow",
            id: id as unknown as string,
            data: { step: 1 },
          })),
        },
        "message",
        { type: "complete", reason: "unknown" },
      );
      expect(message.content).toEqual(
        invalidIds.map(() => ({
          type: "data",
          name: "workflow",
          data: { step: 1 },
        })),
      );
      for (const part of message.content) expect(part).not.toHaveProperty("id");
    },
  );

  it.each(["assistant", "user"] as const)(
    "round-trips data-prefixed part ids on %s messages",
    (role) => {
      const message = fromThreadMessageLike(
        {
          role,
          content: [
            { type: "data-workflow", id: "workflow-1", data: { step: 1 } },
            { type: "data-workflow", id: "", data: { step: 2 } },
            { type: "data-workflow", data: { step: 3 } },
          ],
        },
        "message",
        { type: "complete", reason: "unknown" },
      );

      expect(message.content).toEqual([
        { type: "data", id: "workflow-1", name: "workflow", data: { step: 1 } },
        { type: "data", id: "", name: "workflow", data: { step: 2 } },
        { type: "data", name: "workflow", data: { step: 3 } },
      ]);
      expect(message.content[2]).not.toHaveProperty("id");
      expect(
        fromThreadMessageLike(message, "message", {
          type: "complete",
          reason: "unknown",
        }).content,
      ).toEqual(message.content);
    },
  );

  it("round-trips data-prefixed attachment part ids", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: "hello",
        attachments: [
          {
            id: "attachment",
            type: "file",
            name: "workflow.json",
            status: { type: "complete" },
            content: [
              { type: "data-workflow", id: "workflow-1", data: { step: 1 } },
              { type: "data-workflow", data: { step: 2 } },
            ],
          },
        ],
      },
      "message",
      { type: "complete", reason: "unknown" },
    );

    if (message.role !== "user") throw new Error("expected user");
    expect(message.attachments[0]?.content).toEqual([
      { type: "data", id: "workflow-1", name: "workflow", data: { step: 1 } },
      { type: "data", name: "workflow", data: { step: 2 } },
    ]);
    expect(message.attachments[0]?.content[1]).not.toHaveProperty("id");
    expect(
      fromThreadMessageLike(message, "message", {
        type: "complete",
        reason: "unknown",
      }),
    ).toEqual(message);
  });

  it("preserves modality on user and assistant messages", () => {
    const user = fromThreadMessageLike(
      {
        role: "user",
        content: "Hello",
        metadata: { modality: "voice" },
      },
      "user-id",
      { type: "complete", reason: "unknown" },
    );
    const assistant = fromThreadMessageLike(
      {
        role: "assistant",
        content: "Hi",
        metadata: { modality: "voice" },
      },
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(user.metadata.modality).toBe("voice");
    expect(assistant.metadata.modality).toBe("voice");
  });

  it("leaves modality absent when the input has none", () => {
    const message = fromThreadMessageLike(
      { role: "user", content: "Hello" },
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.metadata).not.toHaveProperty("modality");
  });

  it("ignores modality on system messages", () => {
    const message = fromThreadMessageLike(
      {
        role: "system",
        content: "Instructions",
        metadata: { modality: "voice" },
      },
      "system-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.metadata).not.toHaveProperty("modality");
  });

  it("keeps readable tool-call interactions", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "confirm",
            args: {},
            unstable_interactions: {
              entries: [
                {
                  type: "action",
                  occurredAt: 10,
                  payload: { $input: "approve" },
                },
              ],
            },
          },
        ],
      },
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content[0]).toHaveProperty("unstable_interactions", {
      entries: [
        {
          type: "action",
          occurredAt: 10,
          payload: { $input: "approve" },
        },
      ],
    });
  });

  it("omits unreadable tool-call interactions", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "confirm",
            args: {},
            unstable_interactions: { entries: [{ type: "unknown" }] },
          },
        ],
      } as never,
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content[0]).not.toHaveProperty("unstable_interactions");
  });

  it("gives a reasoning part that carries only a summary an empty text", () => {
    const message = fromThreadMessageLike(
      {
        role: "assistant",
        content: [{ type: "reasoning", unstable_summary: "Searching" }],
      } as never,
      "assistant-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content).toEqual([
      { type: "reasoning", text: "", unstable_summary: "Searching" },
    ]);
  });

  it("drops a user text part without text", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: [{ type: "text" }, { type: "text", text: "hi" }],
      } as never,
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("reads a user attachment without content as one with no parts", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: "hi",
        attachments: [
          {
            id: "a",
            type: "document",
            name: "notes.pdf",
            status: { type: "complete" },
          },
        ],
      } as never,
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    expect(message.role === "user" && message.attachments).toEqual([
      expect.objectContaining({ id: "a", content: [] }),
    ]);
  });

  it.each(["assistant", "user"] as const)(
    "rejects a part without a type as unsupported in a %s message",
    (role) => {
      expect(() =>
        fromThreadMessageLike(
          { role, content: [{ text: "x" }] } as never,
          "message-id",
          { type: "complete", reason: "unknown" },
        ),
      ).toThrow(`Unsupported ${role} message part type: undefined`);
    },
  );
});

describe("fromThreadMessageLike with part fields of the wrong type", () => {
  const status = { type: "complete", reason: "stop" } as const;
  const convert = (role: "assistant" | "user", content: unknown[]) =>
    fromThreadMessageLike({ role, content: content as never }, "id", status)
      .content;

  it.each(["assistant", "user"] as const)(
    "defaults a missing or non-string file mime type on %s messages",
    (role) => {
      expect(
        convert(role, [
          { type: "file", data: "abc" },
          { type: "file", data: "abc", mimeType: { x: 1 }, filename: 3 },
          {
            type: "file",
            data: "abc",
            mimeType: "image/png",
            filename: "a.png",
          },
        ]),
      ).toEqual([
        { type: "file", data: "abc", mimeType: "application/octet-stream" },
        { type: "file", data: "abc", mimeType: "application/octet-stream" },
        { type: "file", data: "abc", mimeType: "image/png", filename: "a.png" },
      ]);
    },
  );

  it.each(["assistant", "user"] as const)(
    "drops a file part whose data is not a string on %s messages",
    (role) => {
      expect(
        convert(role, [
          { type: "file", data: { x: 1 }, mimeType: "text/plain" },
        ]),
      ).toEqual([]);
    },
  );

  it("drops a non-string url source title and a source without a string url", () => {
    expect(
      convert("assistant", [
        {
          type: "source",
          sourceType: "url",
          id: "a",
          url: "https://a.test",
          title: { t: 1 },
        },
        { type: "source", sourceType: "url", id: "b", url: { href: "x" } },
        {
          type: "source",
          sourceType: "url",
          id: "c",
          url: "https://c.test",
          title: "C",
        },
      ]),
    ).toEqual([
      { type: "source", sourceType: "url", id: "a", url: "https://a.test" },
      {
        type: "source",
        sourceType: "url",
        id: "c",
        url: "https://c.test",
        title: "C",
      },
    ]);
  });

  it("gives a document source string title and media type", () => {
    expect(
      convert("assistant", [
        {
          type: "source",
          sourceType: "document",
          id: "d",
          title: [1],
          mediaType: 2,
          filename: {},
        },
      ]),
    ).toEqual([
      {
        type: "source",
        sourceType: "document",
        id: "d",
        title: "",
        mediaType: "application/octet-stream",
      },
    ]);
  });

  it("drops text parts whose text is not a string", () => {
    expect(convert("assistant", [{ type: "text", text: { a: 1 } }])).toEqual(
      [],
    );
    expect(convert("user", [{ type: "text", text: { a: 1 } }])).toEqual([]);
  });

  it("keeps reasoning with a string summary when text is not a string", () => {
    expect(
      convert("assistant", [
        { type: "reasoning", text: { a: 1 }, unstable_summary: "S" },
        { type: "reasoning", text: 5, unstable_summary: { b: 1 } },
      ]),
    ).toEqual([{ type: "reasoning", text: "", unstable_summary: "S" }]);
  });
});
