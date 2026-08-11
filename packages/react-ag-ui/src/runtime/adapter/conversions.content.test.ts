import { describe, expect, it } from "vitest";
import { UserMessageSchema } from "@ag-ui/client";
import { fromAgUiMessages, toAgUiMessages } from "./conversions";

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

describe("toAgUiMessages content metadata", () => {
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
