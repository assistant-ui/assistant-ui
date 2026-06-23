import { describe, expect, it } from "vitest";
import { convertLangChainBaseMessage } from "./convertMessages";
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
