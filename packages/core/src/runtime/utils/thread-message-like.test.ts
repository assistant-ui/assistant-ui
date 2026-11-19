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

  it("drops malformed image parts from attachment content", () => {
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: "hello",
        attachments: [
          {
            id: "attachment",
            type: "file",
            name: "photo.jpg",
            status: { type: "complete" },
            content: [
              { type: "image", image: 42 },
              { type: "image", image: "https://example.com/photo.jpg" },
            ],
          },
        ],
      } as never,
      "user-id",
      { type: "complete", reason: "unknown" },
    );

    if (message.role !== "user") throw new Error("expected user");
    expect(message.attachments[0]?.content).toEqual([
      { type: "image", image: "https://example.com/photo.jpg" },
    ]);
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
    "drops a file part missing a field it needs to render on %s messages",
    (role) => {
      const good = {
        type: "file",
        data: "abc",
        mimeType: "image/png",
        filename: "a.png",
      };
      expect(
        convert(role, [
          { type: "file", data: "abc" },
          { type: "file", data: { x: 1 }, mimeType: "text/plain" },
          { type: "file", data: "abc", mimeType: { x: 1 } },
          good,
        ]),
      ).toEqual([good]);
    },
  );

  it("drops malformed top-level audio and data parts while retaining valid parts", () => {
    const audio = {
      type: "audio",
      audio: { data: "data:audio/wav;base64,YQ==", format: "wav" },
    };
    const data = { type: "data", name: "workflow", data: { step: 1 } };

    expect(
      convert("user", [
        { type: "audio", audio: { data: 42, format: "wav" } },
        {
          type: "audio",
          audio: { data: "data:audio/wav;base64,YQ==", format: 42 },
        },
        { type: "data", data: { step: 2 } },
        { type: "data", name: 42, data: { step: 2 } },
        audio,
        data,
      ]),
    ).toEqual([audio, data]);
  });

  it("drops assistant data parts without a string name while retaining valid parts", () => {
    const data = { type: "data", name: "workflow", data: { step: 1 } };

    expect(
      convert("assistant", [
        { type: "data", data: { step: 2 } },
        { type: "data", name: 42, data: { step: 3 } },
        data,
      ]),
    ).toEqual([data]);
  });

  it.each(["assistant", "user"] as const)(
    "keeps a file part whose optional fields have the wrong type on %s messages, without them",
    (role) => {
      const file = { type: "file", data: "abc", mimeType: "text/plain" };
      expect(
        convert(role, [
          { ...file, filename: 3 },
          { ...file, sourceType: 42 },
          { ...file, filename: "a.txt", sourceType: "blob" },
        ]),
      ).toEqual([file, file, { ...file, filename: "a.txt" }]);
    },
  );

  it.each(["assistant", "user"] as const)(
    "keeps an image part whose filename is not a string on %s messages, without it",
    (role) => {
      const image = { type: "image", image: "https://a.test/a.png" };
      expect(convert(role, [{ ...image, filename: {} }])).toEqual([image]);
    },
  );

  it.each(["assistant", "user"] as const)(
    "keeps an image part whose filename is null on %s messages, without the null",
    (role) => {
      const image = {
        type: "image",
        image: "https://a.test/a.png",
        filename: null,
      };
      expect(convert(role, [image])).toEqual([
        { type: "image", image: "https://a.test/a.png" },
      ]);
    },
  );

  it("removes a null file filename and sourceType and a null url source title", () => {
    expect(
      convert("assistant", [
        {
          type: "file",
          data: "abc",
          mimeType: "text/plain",
          filename: null,
          sourceType: null,
        },
        {
          type: "source",
          sourceType: "url",
          id: "u",
          url: "https://a.test",
          title: null,
        },
      ]),
    ).toEqual([
      { type: "file", data: "abc", mimeType: "text/plain" },
      { type: "source", sourceType: "url", id: "u", url: "https://a.test" },
    ]);
  });

  it("drops a file part missing a required field inside a user attachment and strips a malformed filename", () => {
    const good = { type: "file", data: "abc", mimeType: "text/plain" };
    const message = fromThreadMessageLike(
      {
        role: "user",
        content: [],
        attachments: [
          {
            id: "att",
            type: "file",
            name: "a.txt",
            status: { type: "complete" },
            content: [
              { type: "file", data: "abc", mimeType: 7 },
              { ...good, filename: 3 },
              good,
            ],
          },
        ] as never,
      },
      "id",
      status,
    );
    expect(message.role === "user" && message.attachments[0]!.content).toEqual([
      good,
      good,
    ]);
  });

  it("drops a source missing a field it needs to render", () => {
    const url = {
      type: "source",
      sourceType: "url",
      id: "c",
      url: "https://c.test",
      title: "C",
    };
    const document = {
      type: "source",
      sourceType: "document",
      id: "e",
      title: "E",
      mediaType: "application/pdf",
    };
    expect(
      convert("assistant", [
        { type: "source", sourceType: "url", id: "b", url: { href: "x" } },
        { ...url, id: 1 },
        { ...document, id: "d", title: [1] },
        { ...document, id: "f", mediaType: 2 },
        url,
        document,
      ]),
    ).toEqual([url, document]);
  });

  it("keeps a source whose optional fields have the wrong type, without them", () => {
    const url = {
      type: "source",
      sourceType: "url",
      id: "a",
      url: "https://a.test",
    };
    const document = {
      type: "source",
      sourceType: "document",
      id: "g",
      title: "G",
      mediaType: "application/pdf",
    };
    expect(
      convert("assistant", [
        { ...url, title: { t: 1 } },
        { ...document, filename: {} },
      ]),
    ).toEqual([url, document]);
  });

  it("gives a system message whose text is not a string an empty text", () => {
    expect(
      fromThreadMessageLike(
        { role: "system", content: [{ type: "text", text: 5 }] as never },
        "id",
        status,
      ).content,
    ).toEqual([{ type: "text", text: "" }]);
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
