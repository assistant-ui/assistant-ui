import { describe, expect, expectTypeOf, it } from "vitest";
import type { Message as AgUiWireMessage } from "@ag-ui/client";
import { MessageSchema, UserMessageSchema } from "@ag-ui/core/schemas";
import {
  SimpleImageAttachmentAdapter,
  type AppendMessage,
} from "@assistant-ui/core";
import {
  fromAgUiMessages,
  toAgUiMessages,
  type AgUiMessage,
} from "./conversions";

type Message = Parameters<typeof toAgUiMessages>[0][number];

const userMessage = (
  content: unknown,
  attachments?: Message["attachments"],
): Message =>
  ({
    id: "u1",
    role: "user",
    content,
    ...(attachments && { attachments }),
  }) as Message;

const contentOf = (message: Message) => {
  const [converted] = toAgUiMessages([message]);
  return (converted as { content: unknown }).content;
};

const appendMessage = (): AppendMessage => ({
  role: "user",
  content: [{ type: "text", text: "Hi" }],
  attachments: [],
  createdAt: new Date(),
  parentId: null,
  sourceId: null,
  runConfig: undefined,
  metadata: { custom: {} },
});

describe("toAgUiMessages data URLs", () => {
  it.each(["application/pdf", ""])(
    "unwraps a media-less data URL while retaining the adapter's %j MIME fallback",
    (mimeType) => {
      expect(
        contentOf(
          userMessage([
            { type: "file", data: "data:;base64,SGVsbG8=", mimeType },
          ]),
        ),
      ).toEqual([
        {
          type: "document",
          source: {
            type: "data",
            value: "SGVsbG8=",
            mimeType: mimeType || "application/octet-stream",
          },
        },
      ]);
    },
  );

  it("sniffs a media-less image data URL", () => {
    expect(
      contentOf(
        userMessage([{ type: "image", image: "data:;base64,iVBORw0KGgo=" }]),
      ),
    ).toEqual([
      {
        type: "image",
        source: {
          type: "data",
          value: "iVBORw0KGgo=",
          mimeType: "image/png",
        },
      },
    ]);
  });
});

describe("toAgUiMessages content metadata", () => {
  it("preserves an uploaded image's filename through a snapshot round trip", async () => {
    const adapter = new SimpleImageAttachmentAdapter();
    const pending = await adapter.add({
      file: new File([new Uint8Array([137, 80, 78, 71])], "cat.png", {
        type: "image/png",
      }),
    });
    const attachment = await adapter.send(pending);
    const sent = toAgUiMessages([userMessage([], [attachment])]);
    const restored = fromAgUiMessages(sent);

    expect(restored[0]?.attachments?.[0]?.name).toBe("cat.png");
    expect(sent[0]?.content).toEqual([
      {
        type: "image",
        source: { type: "data", value: "iVBORw==", mimeType: "image/png" },
        metadata: { filename: "cat.png" },
      },
    ]);
  });

  it.each(["image", "document"] as const)(
    "preserves a %s file source and its metadata through a snapshot round trip",
    (type) => {
      const part = {
        type,
        source: {
          type: "file",
          value: `${type}-handle`,
          provider: "openai",
          mimeType: type === "image" ? "image/png" : "application/pdf",
        },
        metadata: { filename: `${type}.bin`, file_id: `${type}-1` },
      };
      const original = {
        id: "u-file",
        role: "user",
        content: [
          { type: "text", text: "label" },
          {
            type: "image",
            source: { type: "url", value: "https://example.com/other.png" },
          },
          part,
        ],
        metadata: { trace: "kept" },
      };

      const imported = fromAgUiMessages([original]);
      const exported = toAgUiMessages(imported);

      expect(MessageSchema.parse(exported[0])).toEqual(original);
      expect(exported).toEqual([original]);
    },
  );

  it("restores each of two file sources that share a handle", () => {
    const original = {
      id: "u-shared",
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "file",
            value: "shared",
            mimeType: "application/pdf",
          },
          metadata: { filename: "a.pdf" },
        },
        {
          type: "document",
          source: {
            type: "file",
            value: "shared",
            provider: "openai",
            mimeType: "application/pdf",
          },
          metadata: { filename: "b.pdf" },
        },
      ],
    };

    expect(toAgUiMessages(fromAgUiMessages([original]))).toEqual([original]);
  });

  it.each(["image", "audio", "video"])(
    "exports a %s file source without a mime type once",
    (type) => {
      const original = {
        id: "u-untyped",
        role: "user",
        content: [{ type, source: { type: "file", value: `${type}-handle` } }],
      };

      expect(toAgUiMessages(fromAgUiMessages([original]))).toEqual([original]);
    },
  );

  it("restores a file source a message carries only in its import metadata", () => {
    const original = {
      id: "u-legacy",
      role: "user",
      content: [
        { type: "text", text: "label" },
        {
          type: "image",
          source: { type: "url", value: "https://example.com/other.png" },
        },
        {
          type: "document",
          source: { type: "file", value: "doc-handle", provider: "openai" },
        },
      ],
    };
    const [imported] = fromAgUiMessages([original]);
    const withoutHandles = {
      ...imported!,
      attachments: imported!.attachments?.filter((attachment) =>
        attachment.content?.every(
          (part) => part.type !== "file" || part.sourceType !== "id",
        ),
      ),
    };

    expect(withoutHandles.attachments).toHaveLength(1);
    expect(toAgUiMessages([withoutHandles])).toEqual([original]);
  });

  describe.each(["content", "attachment"])("%s file handles", (location) => {
    it.each([
      ["document", "application/pdf", "file-pdf"],
      ["image", "image/png", "https://provider.example/files/image"],
      ["audio", "audio/wav", "file-audio"],
      ["video", "video/mp4", "file-video"],
    ])(
      "preserves a %s handle instead of sending bytes",
      (type, mimeType, data) => {
        const part = {
          type: "file",
          data,
          mimeType,
          sourceType: "id",
          filename: "upload.bin",
          providerMetadata: { agui: { trace: "kept" } },
        };
        const message =
          location === "content"
            ? userMessage([part])
            : userMessage([], [{ name: "upload.bin", content: [part] }]);
        const exported = toAgUiMessages([message]);
        const expected = {
          id: "u1",
          role: "user",
          content: [
            {
              type,
              source: { type: "file", value: data, mimeType },
              metadata: { trace: "kept", filename: "upload.bin" },
            },
          ],
        };

        const imported = fromAgUiMessages(exported);

        expect(MessageSchema.parse(exported[0])).toEqual(expected);
        expect(imported[0]?.attachments).toEqual([
          expect.objectContaining({
            content: [
              {
                type: "file",
                data,
                mimeType,
                sourceType: "id",
                filename: "upload.bin",
                providerMetadata: { agui: { trace: "kept" } },
              },
            ],
          }),
        ]);
        expect(toAgUiMessages(imported)).toEqual([expected]);
      },
    );
  });

  it("emits AgUiMessage values assignable to AG-UI Message", () => {
    expectTypeOf<AgUiMessage>().toExtend<AgUiWireMessage>();
  });

  it("emits records MessageSchema accepts", () => {
    const converted = toAgUiMessages([
      { id: "u-1", role: "user", content: "Hi" },
      { id: "a-1", role: "assistant", content: "Hello" },
      { id: "s-1", role: "system", content: "Be brief" },
      { id: "t-1", role: "tool", content: "ok", toolCallId: "c-1" },
      { id: "r-1", role: "reasoning", content: "hmm" },
    ]);

    expect(converted.map((message) => MessageSchema.parse(message))).toEqual(
      converted,
    );
  });

  it("normalizes an AppendMessage without an id", () => {
    const converted = toAgUiMessages([appendMessage()])[0];
    if (!converted) throw new Error("expected a converted message");

    expect(UserMessageSchema.parse(converted)).toMatchObject({
      role: "user",
      content: "Hi",
    });
    expect(converted.id).toEqual(expect.any(String));
  });

  it("preserves a caller-supplied id", () => {
    const converted = toAgUiMessages([
      { ...appendMessage(), id: "stable-user-1" },
    ])[0];
    if (!converted) throw new Error("expected a converted message");

    expect(UserMessageSchema.parse(converted).id).toBe("stable-user-1");
  });

  it("carries a part's agui provider metadata onto an image item", () => {
    expect(
      contentOf(
        userMessage([
          {
            type: "image",
            image: "https://example.com/cat.png",
            providerMetadata: { agui: { file_id: "f_1" } },
          },
        ]),
      ),
    ).toEqual([
      {
        type: "image",
        source: { type: "url", value: "https://example.com/cat.png" },
        metadata: { file_id: "f_1" },
      },
    ]);
  });

  it("preserves a direct image part's filename through a snapshot round trip", () => {
    const sent = toAgUiMessages([
      userMessage([
        {
          type: "image",
          image: "https://example.com/cat.png",
          filename: "cat.png",
        },
      ]),
    ]);

    expect((sent[0] as { content: unknown }).content).toEqual([
      {
        type: "image",
        source: { type: "url", value: "https://example.com/cat.png" },
        metadata: { filename: "cat.png" },
      },
    ]);

    const rebuilt = fromAgUiMessages(sent as never);
    const attachment = (rebuilt[0] as unknown as { attachments: unknown[] })
      .attachments[0];

    expect(attachment).toMatchObject({
      name: "cat.png",
      content: [{ type: "image", filename: "cat.png" }],
    });
  });

  it("merges a file part's metadata with its filename", () => {
    expect(
      contentOf(
        userMessage([
          {
            type: "file",
            data: "https://example.com/spec.pdf",
            mimeType: "application/pdf",
            filename: "spec.pdf",
            providerMetadata: { agui: { file_id: "f_2" } },
          },
        ]),
      ),
    ).toEqual([
      {
        type: "document",
        source: {
          type: "url",
          value: "https://example.com/spec.pdf",
          mimeType: "application/pdf",
        },
        metadata: { file_id: "f_2", filename: "spec.pdf" },
      },
    ]);
  });

  it("keeps the part's own filename over one in the metadata", () => {
    expect(
      contentOf(
        userMessage([
          {
            type: "file",
            data: "https://example.com/spec.pdf",
            mimeType: "application/pdf",
            filename: "spec.pdf",
            providerMetadata: { agui: { filename: "renamed.pdf" } },
          },
        ]),
      ),
    ).toMatchObject([{ metadata: { filename: "spec.pdf" } }]);
  });

  it("carries metadata from an attachment's content part", () => {
    expect(
      contentOf(
        userMessage([], [
          {
            name: "spec.pdf",
            contentType: "application/pdf",
            content: [
              {
                type: "file",
                data: "https://example.com/spec.pdf",
                mimeType: "application/pdf",
                providerMetadata: { agui: { file_id: "f_3" } },
              },
            ],
          },
        ] as Message["attachments"]),
      ),
    ).toMatchObject([{ type: "document", metadata: { file_id: "f_3" } }]);
  });

  it("ignores metadata namespaced for another provider", () => {
    expect(
      contentOf(
        userMessage([
          {
            type: "image",
            image: "https://example.com/cat.png",
            providerMetadata: { openai: { file_id: "f_4" } },
          },
        ]),
      ),
    ).toEqual([
      {
        type: "image",
        source: { type: "url", value: "https://example.com/cat.png" },
      },
    ]);
  });

  it("emits no metadata channel for text, which the schema has no field for", () => {
    expect(
      contentOf(
        userMessage([
          {
            type: "text",
            text: "hello",
            providerMetadata: { agui: { file_id: "f_5" } },
          },
          { type: "image", image: "https://example.com/cat.png" },
        ]),
      ),
    ).toEqual([
      { type: "text", text: "hello" },
      {
        type: "image",
        source: { type: "url", value: "https://example.com/cat.png" },
      },
    ]);
  });

  it("stays valid against the upstream user message schema", () => {
    const [converted] = toAgUiMessages([
      userMessage([
        {
          type: "file",
          data: "https://example.com/spec.pdf",
          mimeType: "application/pdf",
          filename: "spec.pdf",
          providerMetadata: { agui: { file_id: "f_6", nested: { a: 1 } } },
        },
      ]),
    ]);

    expect(
      UserMessageSchema.safeParse(JSON.parse(JSON.stringify(converted)))
        .success,
    ).toBe(true);
  });

  it("survives a snapshot round trip", () => {
    const sent = toAgUiMessages([
      userMessage([
        {
          type: "file",
          data: "https://example.com/spec.pdf",
          mimeType: "application/pdf",
          filename: "spec.pdf",
          providerMetadata: { agui: { file_id: "f_7" } },
        },
      ]),
    ]);

    const rebuilt = fromAgUiMessages(sent as never);
    const attachment = (rebuilt[0] as unknown as { attachments: unknown[] })
      .attachments[0] as { content: unknown[] };

    expect(attachment.content[0]).toMatchObject({
      type: "file",
      filename: "spec.pdf",
      providerMetadata: { agui: { file_id: "f_7" } },
    });

    expect(toAgUiMessages(rebuilt as never)).toEqual(sent);
  });
});

describe("toAgUiMessages percent-encoded data URLs", () => {
  it("sends a data URL that is not base64 as a url source", () => {
    expect(
      contentOf(
        userMessage([
          { type: "image", image: "data:image/svg+xml,%3Csvg%2F%3E" },
          {
            type: "file",
            data: "data:text/plain,hello",
            mimeType: "text/plain",
            filename: "f.txt",
          },
        ]),
      ),
    ).toEqual([
      {
        type: "image",
        source: { type: "url", value: "data:image/svg+xml,%3Csvg%2F%3E" },
      },
      {
        type: "document",
        source: {
          type: "url",
          value: "data:text/plain,hello",
          mimeType: "text/plain",
        },
        metadata: { filename: "f.txt" },
      },
    ]);
  });

  it("keeps a data URL that is not base64 through a snapshot round trip", () => {
    const sent = toAgUiMessages([
      userMessage([
        {
          type: "file",
          data: "data:text/plain,hello",
          mimeType: "text/plain",
          filename: "f.txt",
        },
      ]),
    ]);

    const rebuilt = fromAgUiMessages(sent as never);
    const attachment = (rebuilt[0] as unknown as { attachments: unknown[] })
      .attachments[0] as { content: unknown[] };

    expect(attachment.content[0]).toMatchObject({
      type: "file",
      data: "data:text/plain,hello",
      mimeType: "text/plain",
    });
    expect(toAgUiMessages(rebuilt as never)).toEqual(sent);
  });
});

describe("toAgUiMessages tool model content", () => {
  const withModelContent = (modelContent: unknown): Message => ({
    id: "a1",
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "download",
        args: {},
        argsText: "{}",
        result: { private: "not model-visible" },
        modelContent,
      },
    ],
  });

  it.each([
    ["image", "image/png"],
    ["document", "application/pdf"],
    ["audio", "audio/wav"],
    ["video", "video/mp4"],
  ])(
    "keeps %s model content through a snapshot round trip",
    (type, mediaType) => {
      const exported = toAgUiMessages([
        withModelContent([
          { type: "text", text: "Before" },
          { type: "file", data: "YWJj", mediaType, filename: "result.bin" },
          { type: "text", text: "After" },
        ]),
      ]);
      const expected = {
        id: "call-1:tool",
        role: "tool",
        toolCallId: "call-1",
        content: [
          { type: "text", text: "Before" },
          {
            type,
            source: { type: "data", value: "YWJj", mimeType: mediaType },
            metadata: { filename: "result.bin" },
          },
          { type: "text", text: "After" },
        ],
      };

      expect(MessageSchema.parse(exported[1])).toEqual(expected);
      expect(toAgUiMessages(fromAgUiMessages(exported))[1]).toEqual(expected);
    },
  );

  it("sends a file-only model result instead of an empty string", () => {
    const exported = toAgUiMessages([
      withModelContent([
        {
          type: "file",
          data: "https://example.com/report.pdf",
          mediaType: "application/pdf",
        },
      ]),
    ]);

    expect(exported[1]?.content).toEqual([
      {
        type: "document",
        source: {
          type: "url",
          value: "https://example.com/report.pdf",
          mimeType: "application/pdf",
        },
      },
    ]);
  });

  it.each([
    { modelContent: [], content: "" },
    { modelContent: [{ type: "text", text: "public" }], content: "public" },
  ])(
    "keeps text-only model content as $content",
    ({ modelContent, content }) => {
      expect(toAgUiMessages([withModelContent(modelContent)])[1]?.content).toBe(
        content,
      );
    },
  );
});
