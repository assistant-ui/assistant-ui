import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import {
  convertLangChainBaseMessage,
  getMessageContent,
} from "./convertMessages";
import type { LangChainBaseMessage, UIMessage } from "./types";

const humanMessage = (content: unknown): LangChainBaseMessage => ({
  _getType: () => "human",
  id: "msg-1",
  content,
});

const aiMessage = (content: unknown): LangChainBaseMessage => ({
  _getType: () => "ai",
  id: "msg-2",
  content,
});

const contentOf = (result: ReturnType<typeof convertLangChainBaseMessage>) => {
  if (result.role === "tool")
    throw new Error("expected a content-bearing message");
  return result.content;
};

describe("convertLangChainBaseMessage file content parts", () => {
  it("converts a base64 file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          data: "ZmFrZQ==",
          mime_type: "application/pdf",
          source_type: "base64",
          metadata: { filename: "a.pdf" },
        },
      ]),
      {},
    );

    expect(contentOf(result)).toEqual([
      {
        type: "file",
        filename: "a.pdf",
        data: "ZmFrZQ==",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("falls back to a default filename when metadata is absent", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        { type: "file", data: "ZmFrZQ==", mime_type: "application/pdf" },
      ]),
      {},
    );

    expect(contentOf(result)).toEqual([
      {
        type: "file",
        filename: "file",
        data: "ZmFrZQ==",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("converts a url source file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          url: "https://r2.example/u/abc/file.pdf",
          mime_type: "application/pdf",
          source_type: "url",
          metadata: { filename: "file.pdf" },
        },
      ]),
      {},
    );

    expect(contentOf(result)).toEqual([
      {
        type: "file",
        filename: "file.pdf",
        data: "https://r2.example/u/abc/file.pdf",
        mimeType: "application/pdf",
        sourceType: "url",
      },
    ]);
  });

  it("converts an id source file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([{ type: "file", id: "file-abc123", source_type: "id" }]),
      {},
    );

    expect(contentOf(result)).toEqual([
      {
        type: "file",
        filename: "file",
        data: "file-abc123",
        mimeType: "application/octet-stream",
        sourceType: "id",
      },
    ]);
  });
});

describe("getMessageContent file blocks", () => {
  const appendMessage = (part: Record<string, unknown>) =>
    ({ content: [part] }) as unknown as AppendMessage;

  it("emits a base64 source block for raw base64 data", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "ZmFrZQ==",
        mimeType: "application/pdf",
        filename: "a.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        data: "ZmFrZQ==",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "base64",
      },
    ]);
  });

  it("emits a url source block with the value in the url key for http(s) data", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "https://r2.example/u/abc/file.pdf",
        mimeType: "application/pdf",
        filename: "file.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        url: "https://r2.example/u/abc/file.pdf",
        mime_type: "application/pdf",
        metadata: { filename: "file.pdf" },
        source_type: "url",
      },
    ]);
    expect(content[1]).not.toHaveProperty("data");
  });

  it("normalizes a base64 data URL to a raw base64 block", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "data:application/pdf;base64,ZmFrZQ==",
        mimeType: "application/octet-stream",
        filename: "a.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        data: "ZmFrZQ==",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "base64",
      },
    ]);
  });

  it("keeps non-http schemes on the base64 path", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "blob:https://app.example/123",
        mimeType: "application/pdf",
        filename: "a.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        data: "blob:https://app.example/123",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "base64",
      },
    ]);
  });

  it("emits an id source block with the value in the id key for sourceType id", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "flx::storage:file_object:abc",
        mimeType: "application/pdf",
        filename: "invoice.pdf",
        sourceType: "id",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        id: "flx::storage:file_object:abc",
        mime_type: "application/pdf",
        metadata: { filename: "invoice.pdf" },
        source_type: "id",
      },
    ]);
    expect(content[1]).not.toHaveProperty("data");
  });

  it("lets sourceType url override sniffing for non-http data", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "s3://bucket/key.pdf",
        mimeType: "application/pdf",
        filename: "key.pdf",
        sourceType: "url",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        url: "s3://bucket/key.pdf",
        mime_type: "application/pdf",
        metadata: { filename: "key.pdf" },
        source_type: "url",
      },
    ]);
  });

  it("emits an id source block for attachment content parts", () => {
    const content = getMessageContent({
      content: [{ type: "text", text: "see attached" }],
      attachments: [
        {
          content: [
            {
              type: "file",
              data: "file-abc123",
              mimeType: "application/pdf",
              filename: "a.pdf",
              sourceType: "id",
            },
          ],
        },
      ],
    } as unknown as AppendMessage);

    expect(content).toEqual([
      { type: "text", text: "see attached" },
      {
        type: "file",
        id: "file-abc123",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "id",
      },
    ]);
  });

  it("round-trips an id source block through both converters", () => {
    const converted = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          id: "file-abc123",
          mime_type: "application/pdf",
          source_type: "id",
          metadata: { filename: "a.pdf" },
        },
      ]),
      {},
    );

    const content = getMessageContent(converted as unknown as AppendMessage);

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        id: "file-abc123",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "id",
      },
    ]);
  });

  it("emits an audio block for a base64 file part with an audio mime type", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "c291bmQ=",
        mimeType: "audio/mp3",
        filename: "memo.mp3",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "audio",
        data: "c291bmQ=",
        mime_type: "audio/mp3",
        source_type: "base64",
      },
    ]);
  });

  it("normalizes audio/mpeg and audio/x-wav to the accepted spellings", () => {
    expect(
      getMessageContent(
        appendMessage({
          type: "file",
          data: "c291bmQ=",
          mimeType: "audio/mpeg",
        }),
      )[1],
    ).toMatchObject({ type: "audio", mime_type: "audio/mp3" });

    expect(
      getMessageContent(
        appendMessage({
          type: "file",
          data: "c291bmQ=",
          mimeType: "audio/x-wav",
        }),
      )[1],
    ).toMatchObject({ type: "audio", mime_type: "audio/wav" });
  });

  it("strips the data URL envelope from an audio file part", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "data:audio/mpeg;base64,c291bmQ=",
        mimeType: "audio/mp3",
      }),
    );

    expect(content[1]).toEqual({
      type: "audio",
      data: "c291bmQ=",
      mime_type: "audio/mp3",
      source_type: "base64",
    });
  });

  it("keeps url and id audio references as file blocks", () => {
    expect(
      getMessageContent(
        appendMessage({
          type: "file",
          data: "https://cdn.example.com/memo.mp3",
          mimeType: "audio/mp3",
          filename: "memo.mp3",
        }),
      )[1],
    ).toMatchObject({ type: "file", source_type: "url" });

    expect(
      getMessageContent(
        appendMessage({
          type: "file",
          data: "file-abc123",
          mimeType: "audio/mp3",
          filename: "memo.mp3",
          sourceType: "id",
        }),
      )[1],
    ).toMatchObject({ type: "file", source_type: "id" });
  });

  it("does not treat inherited object keys as audio media types", () => {
    for (const mimeType of ["__proto__", "constructor"]) {
      expect(
        getMessageContent(
          appendMessage({
            type: "file",
            data: "ZmFrZQ==",
            mimeType,
            filename: "a.bin",
          }),
        )[1],
      ).toMatchObject({ type: "file", mime_type: mimeType });
    }
  });

  it("detects audio from the data URL envelope when the declared type is generic", () => {
    expect(
      getMessageContent(
        appendMessage({
          type: "file",
          data: "data:audio/mpeg;base64,c291bmQ=",
          mimeType: "application/octet-stream",
        }),
      )[1],
    ).toEqual({
      type: "audio",
      data: "c291bmQ=",
      mime_type: "audio/mp3",
      source_type: "base64",
    });
  });

  it("leaves non-audio file parts as file blocks", () => {
    expect(
      getMessageContent(
        appendMessage({
          type: "file",
          data: "ZmFrZQ==",
          mimeType: "application/pdf",
          filename: "a.pdf",
        }),
      )[1],
    ).toMatchObject({ type: "file", mime_type: "application/pdf" });
  });
});

describe("getMessageContent audio and data parts", () => {
  const appendMessage = (...parts: Record<string, unknown>[]) =>
    ({ content: parts }) as unknown as AppendMessage;

  it("emits a base64 audio block with the format MIME type for audio parts", () => {
    const content = getMessageContent(
      appendMessage({
        type: "audio",
        audio: { data: "c291bmQ=", format: "mp3" },
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "audio",
        data: "c291bmQ=",
        mime_type: "audio/mp3",
        source_type: "base64",
      },
    ]);
  });

  it("strips a data URL envelope from audio data", () => {
    const content = getMessageContent(
      appendMessage({
        type: "audio",
        audio: { data: "data:audio/wav;base64,d2F2", format: "wav" },
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "audio",
        data: "d2F2",
        mime_type: "audio/wav",
        source_type: "base64",
      },
    ]);
  });

  it("keeps the format-derived MIME when a data URL carries a divergent one", () => {
    const content = getMessageContent(
      appendMessage({
        type: "audio",
        audio: { data: "data:audio/mpeg;base64,c291bmQ=", format: "mp3" },
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "audio",
        data: "c291bmQ=",
        mime_type: "audio/mp3",
        source_type: "base64",
      },
    ]);
  });

  it("does not prepend a second placeholder when text accompanies audio", () => {
    const content = getMessageContent(
      appendMessage(
        { type: "text", text: "listen" },
        { type: "audio", audio: { data: "d2F2", format: "wav" } },
      ),
    );

    expect(content).toEqual([
      { type: "text", text: "listen" },
      {
        type: "audio",
        data: "d2F2",
        mime_type: "audio/wav",
        source_type: "base64",
      },
    ]);
  });

  it("drops data parts while keeping the rest of the message", () => {
    const content = getMessageContent(
      appendMessage(
        { type: "text", text: "hi" },
        { type: "data", name: "chart", data: { values: [1, 2] } },
      ),
    );

    expect(content).toBe("hi");
  });

  it("returns empty content for a data-only message", () => {
    const content = getMessageContent(
      appendMessage({ type: "data", name: "chart", data: { values: [1, 2] } }),
    );

    expect(content).toEqual([]);
  });

  it("still throws on assistant-only part types", () => {
    expect(() =>
      getMessageContent(appendMessage({ type: "reasoning", text: "hmm" })),
    ).toThrow("Unsupported append message part type: reasoning");
  });
});

describe("contentToParts audio blocks", () => {
  const inboundAudioPart = (block: Record<string, unknown>) => {
    const result = convertLangChainBaseMessage(
      {
        _getType: () => "human",
        id: "h1",
        content: [{ type: "audio", data: "c291bmQ=", ...block }],
      },
      {},
    );
    return contentOf(result)[0];
  };

  it("converts an inbound base64 audio block back to an audio part", () => {
    const result = convertLangChainBaseMessage(
      {
        _getType: () => "human",
        id: "h1",
        content: [
          {
            type: "audio",
            data: "c291bmQ=",
            mime_type: "audio/mp3",
            source_type: "base64",
          },
        ],
      },
      {},
    );

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "audio.mp3",
          data: "c291bmQ=",
          mimeType: "audio/mp3",
        },
      ],
    });
  });

  it("keeps an inbound audio block whose mime type has no wire format", () => {
    const result = convertLangChainBaseMessage(
      {
        _getType: () => "human",
        id: "h1",
        content: [
          {
            type: "audio",
            data: "b2dn",
            mime_type: "audio/ogg",
            source_type: "base64",
          },
        ],
      },
      {},
    );

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "audio.ogg",
          data: "b2dn",
          mimeType: "audio/ogg",
        },
      ],
    });
  });

  it("keeps an audio block on an assistant message", () => {
    const result = convertLangChainBaseMessage(
      {
        _getType: () => "ai",
        id: "ai-1",
        content: [
          {
            type: "audio",
            data: "c291bmQ=",
            mime_type: "audio/mp3",
            source_type: "base64",
          },
          { type: "text", text: "done" },
        ],
      },
      {},
    );

    expect(result).toMatchObject({
      role: "assistant",
      content: [
        {
          type: "file",
          filename: "audio.mp3",
          data: "c291bmQ=",
          mimeType: "audio/mp3",
        },
        { type: "text", text: "done" },
      ],
    });
  });
  it("round-trips an audio file part through both converters", () => {
    const outbound = getMessageContent({
      content: [
        {
          type: "file",
          data: "data:audio/mpeg;base64,c291bmQ=",
          mimeType: "audio/mpeg",
          filename: "memo.mp3",
        },
      ],
    } as unknown as AppendMessage);

    const inbound = convertLangChainBaseMessage(
      {
        _getType: () => "human",
        id: "h1",
        content: outbound as never,
      },
      {},
    );

    expect(contentOf(inbound)).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        filename: "audio.mp3",
        data: "c291bmQ=",
        mimeType: "audio/mp3",
      },
    ]);

    expect(
      getMessageContent({
        content: contentOf(inbound),
      } as unknown as AppendMessage),
    ).toEqual(outbound);
  });
  it("names an inbound audio attachment from its media subtype", () => {
    expect(inboundAudioPart({ mime_type: "audio/wav" })).toMatchObject({
      filename: "audio.wav",
    });
    expect(inboundAudioPart({})).toMatchObject({
      filename: "audio",
      mimeType: "application/octet-stream",
    });
  });
});

describe("convertLangChainBaseMessage reasoning content parts", () => {
  it("joins summary parts into a single reasoning part", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([
        {
          type: "reasoning",
          summary: [
            { type: "summary_text", text: "first" },
            { type: "summary_text", text: "second" },
          ],
        },
      ]),
      {},
    );

    expect(contentOf(result)).toEqual([
      { type: "reasoning", text: "first\n\n\nsecond" },
    ]);
  });

  it("falls back to the reasoning string when summary is absent", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([{ type: "reasoning", reasoning: "thinking out loud" }]),
      {},
    );

    expect(contentOf(result)).toEqual([
      { type: "reasoning", text: "thinking out loud" },
    ]);
  });

  it("does not throw when a reasoning block omits both summary and reasoning", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([{ type: "reasoning" }]),
      {},
    );

    expect(contentOf(result)).toEqual([{ type: "reasoning", text: "" }]);
  });

  it("tolerates null entries inside the summary array", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([
        {
          type: "reasoning",
          summary: [null, { type: "summary_text", text: "kept" }],
        },
      ]),
      {},
    );

    expect(contentOf(result)).toEqual([
      { type: "reasoning", text: "\n\n\nkept" },
    ]);
  });
});

describe("convertLangChainBaseMessage generative UI from graph state", () => {
  const uiMessage = (messageId: string): UIMessage => ({
    type: "ui",
    id: "ui-1",
    name: "chart",
    props: { points: [1, 2, 3] },
    metadata: { message_id: messageId },
  });

  it("appends a data part for UI attached to the assistant message", () => {
    const result = convertLangChainBaseMessage(aiMessage("hello"), {
      uiMessagesByParent: new Map([["msg-2", [uiMessage("msg-2")]]]),
    });

    expect(contentOf(result)).toEqual([
      { type: "text", text: "hello" },
      { type: "data", name: "chart", data: { points: [1, 2, 3] } },
    ]);
  });

  it("leaves the message unchanged when no UI targets it", () => {
    const result = convertLangChainBaseMessage(aiMessage("hello"), {
      uiMessagesByParent: new Map([["other-id", [uiMessage("other-id")]]]),
    });

    expect(contentOf(result)).toEqual([{ type: "text", text: "hello" }]);
  });

  it("appends a data part per UI when several target the same message", () => {
    const result = convertLangChainBaseMessage(aiMessage("hello"), {
      uiMessagesByParent: new Map([
        [
          "msg-2",
          [
            { ...uiMessage("msg-2"), name: "chart", props: { a: 1 } },
            { ...uiMessage("msg-2"), name: "table", props: { b: 2 } },
          ],
        ],
      ]),
    });

    expect(contentOf(result)).toEqual([
      { type: "text", text: "hello" },
      { type: "data", name: "chart", data: { a: 1 } },
      { type: "data", name: "table", data: { b: 2 } },
    ]);
  });

  it("does not attach UI to an assistant message without an id", () => {
    const result = convertLangChainBaseMessage(
      { ...aiMessage("hello"), id: undefined },
      { uiMessagesByParent: new Map([["", [uiMessage("")]]]) },
    );

    expect(contentOf(result)).toEqual([{ type: "text", text: "hello" }]);
  });

  it("leaves the message unchanged when no converter metadata is passed", () => {
    const result = convertLangChainBaseMessage(aiMessage("hello"));

    expect(contentOf(result)).toEqual([{ type: "text", text: "hello" }]);
  });
});

describe("convertLangChainBaseMessage image content parts", () => {
  it("reads the url from an image_url object", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        { type: "image_url", image_url: { url: "https://example.com/a.png" } },
      ]),
      {},
    );

    expect(contentOf(result)).toEqual([
      { type: "image", image: "https://example.com/a.png" },
    ]);
  });

  it("drops the image part when image_url is undefined", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([{ type: "image_url" }]),
      {},
    );

    expect(contentOf(result)).toEqual([]);
  });
});
